import { NextResponse } from 'next/server'

import {
  resolveSession,
  getTenantFromHeaders,
  writeTransactionLog,
  ID_ORIGIN_WEB,
  withTenantContext,
  resolveUserViews
} from '@gaso/shared'
import { normalizeTenantSettingsFromRow, TenantSettingsRow } from '@/lib/tenant-settings/normalize'
import { MeResponse, ModuleRow, ProfileRow, TenantRow, UserRow } from '@gaso/shared/types/me'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  const auth = await resolveSession(req)

  if (!auth) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 })
  }

  const userId = auth.userId
  const sessionTenantId = auth.tenantId

  let tenantId: string

  try {
    const { id } = getTenantFromHeaders(req.headers)

    tenantId = id
  } catch {
    return NextResponse.json({ message: 'Contexto de tenant no disponible' }, { status: 401 })
  }

  if (sessionTenantId && sessionTenantId.toLowerCase() !== tenantId.toLowerCase()) {
    return NextResponse.json({ message: 'Sesión de tenant no válida' }, { status: 403 })
  }

  const tenantSlugOrDefault = req.headers.get('x-tenant-slug') ?? ''
  const tenantNameOrDefault = req.headers.get('x-tenant-name') ?? ''
  const idOriginRaw = req.headers.get('x-origin-id')
  const idOrigin = idOriginRaw !== null ? Number(idOriginRaw) : ID_ORIGIN_WEB

  try {
    const result = await withTenantContext(tenantId, async tx => {
      const [userRows, tenantRows, profileRows, moduleRows, settingsRows, resolvedViews] = await Promise.all([
        tx.$queryRaw<UserRow[]>`
          SELECT IdUsuario, Nombre, Email, IdPerfil, isAdmin, IdArea, IdBaseCiudad, IdDepartamento, IdPuesto, IdRegion, IdEmpresa
          FROM GASOCO_Cat_Usuarios
          WHERE IdUsuario = ${userId} AND TenantID = CAST(${tenantId} AS uniqueidentifier)
        `,
        tx.$queryRaw<TenantRow[]>`
          SELECT
            TenantID,
            CompanyName,
            (CASE
              WHEN Status = 'ACTIVE' THEN 1
              WHEN Status = 'TRIAL' THEN 1
              ELSE 0
            END) AS isActive,
            Dominio
          FROM Security.Tenants
          WHERE TenantID = CAST(${tenantId} AS uniqueidentifier)
        `,
        tx.$queryRaw<ProfileRow[]>`
          SELECT p.Id, p.Descripcion
          FROM GASOCO_Cat_Perfiles p
          INNER JOIN GASOCO_Cat_Usuarios u ON u.IdPerfil = p.Id
          WHERE u.IdUsuario = ${userId} AND u.TenantID = CAST(${tenantId} AS uniqueidentifier)
        `,
        tx.$queryRaw<ModuleRow[]>`
          SELECT
            m.IdModulo,
            m.NombreModulo,
            sm.IdSubModulo,
            sm.NombreSubModulo
          FROM Permisos_Paquetes pp
          INNER JOIN Cat_Modulos m ON m.IdModulo = pp.IdModulo
          LEFT JOIN Cat_SubModulos sm ON sm.IdModulo = pp.IdModulo AND sm.IdSec = pp.IdSec
          WHERE pp.IdPaquete = (
            SELECT TOP 1 e.Paquete
            FROM Cat_Empresas e
            INNER JOIN GASOCO_Cat_Usuarios u ON u.IdEmpresa = e.IdEmpresa
            WHERE u.IdUsuario = ${userId}
              AND u.TenantID = CAST(${tenantId} AS uniqueidentifier)
          )
          ORDER BY m.IdModulo, sm.IdSubModulo
        `,
        tx.$queryRaw<TenantSettingsRow[]>`
          SELECT BrandingJson, ModulesJson, LimitsJson
          FROM Security.TenantSettings
          WHERE TenantID = CAST(${tenantId} AS uniqueidentifier)
        `,
        resolveUserViews(tx, { tenantId, idUsuario: userId })
      ])

      const user = userRows[0]

      if (!user) throw new Error('USER_NOT_FOUND')

      const tenant = tenantRows[0]

      const profile = profileRows[0] ?? null

      const permissionsMap = new Map<number, { moduleId: number; moduleName: string; subModules: Set<string> }>()

      for (const row of moduleRows) {
        if (!permissionsMap.has(row.IdModulo)) {
          permissionsMap.set(row.IdModulo, {
            moduleId: row.IdModulo,
            moduleName: row.NombreModulo ?? '',
            subModules: new Set()
          })
        }

        if (row.IdSubModulo != null && row.NombreSubModulo != null) {
          permissionsMap
            .get(row.IdModulo)!
            .subModules.add(JSON.stringify({ id: row.IdSubModulo, name: row.NombreSubModulo }))
        }
      }

      const permissions = Array.from(permissionsMap.values()).map(m => ({
        moduleId: m.moduleId,
        moduleName: m.moduleName,
        subModules: Array.from(m.subModules).map(s => JSON.parse(s) as { id: number; name: string })
      }))

      const views: MeResponse['views'] = {}
      const menuGroups: Record<string, boolean> = {}
      for (const v of resolvedViews) {
        views[v.viewCode] = { mask: v.mask, label: v.label, menuGroup: v.menuGroup }
        if (v.menuGroup) menuGroups[v.menuGroup] = true
      }

      const settings = normalizeTenantSettingsFromRow(settingsRows[0] ?? null)

      const body: MeResponse = {
        user: {
          id: user.IdUsuario,
          name: user.Nombre,
          email: user.Email,
          admin: user.isAdmin === 1,
          area: user.IdArea ?? null,
          cityBase: user.IdBaseCiudad ?? null,
          departament: user.IdDepartamento ?? null,
          position: user.IdPuesto ?? null,
          region: user.IdRegion ?? null,
          company: user.IdEmpresa ?? null
        },
        tenant: {
          id: tenantId,
          slug: tenantSlugOrDefault || tenant?.Dominio || sessionTenantId || '',
          name: tenant?.CompanyName ?? tenantNameOrDefault,
          isActive: tenant?.isActive === 1
        },
        profile: profile
          ? { id: profile.Id, name: profile.Descripcion ?? null }
          : { id: null, name: null },
        permissions, // legacy: se queda, DEPRECATED hasta que el shell migre
        views,
        menuGroups,
        settings
      }

      return body
    })

    writeTransactionLog({
      tenantId,
      tableName: 'Api.Me',
      action: 'READ',
      userId,
      appUser: result.user.email ?? null,
      idOrigin,
      newData: {
        profileId: result.profile.id,
        hasTenantSettings: true
      }
    }).catch(() => { })

    return NextResponse.json(result)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'

    if (message === 'USER_NOT_FOUND') {
      return NextResponse.json({ message: 'Usuario no encontrado' }, { status: 404 })
    }

    console.error('[ME_ROUTE_ERROR]', message)

    return NextResponse.json({ message: 'Error al cargar perfil' }, { status: 500 })
  }
}
