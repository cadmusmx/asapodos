import { NextResponse } from 'next/server'

import {
  resolveSession,
  getTenantFromHeaders,
  writeTransactionLog,
  ID_ORIGIN_WEB,
  withTenantContext,
  resolveUserViews,
  getEnabledMenuGroups
} from '@gaso/shared'

import type { PlanTier, TenantSubscriptionStatus } from '@gaso/shared/types/plan'
import type { MeResponse, ProfileRow, TenantRow, UserRow } from '@gaso/shared/types/me'

import type { TenantSettingsRow } from '@/lib/tenant-settings/normalize'
import { normalizeTenantSettingsFromRow } from '@/lib/tenant-settings/normalize'

interface SubscriptionPlanRow {
  PlanName: string | null
  PlanDisplayName: string | null
  Status: string | null
}

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
      const [userRows, tenantRows, profileRows, settingsRows, subscriptionRows, resolvedViews, planModules] = await Promise.all([
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
        tx.$queryRaw<TenantSettingsRow[]>`
          SELECT BrandingJson, LimitsJson
          FROM Security.TenantSettings
          WHERE TenantID = CAST(${tenantId} AS uniqueidentifier)
        `,
        tx.$queryRaw<SubscriptionPlanRow[]>`
          SELECT TOP 1
            p.Name AS PlanName,
            p.DisplayName AS PlanDisplayName,
            s.Status
          FROM Security.TenantSubscriptions s
          INNER JOIN Security.Plans p ON p.PlanId = s.PlanId
          WHERE s.TenantId = CAST(${tenantId} AS uniqueidentifier)
            AND s.Status IN ('TRIAL', 'ACTIVE')
          ORDER BY s.CreatedAt DESC
        `,
        resolveUserViews(tx, { tenantId, idUsuario: userId }),
        getEnabledMenuGroups(tx, tenantId),
      ])

      const user = userRows[0]

      if (!user) throw new Error('USER_NOT_FOUND')

      const tenant = tenantRows[0]

      const profile = profileRows[0] ?? null

      const views: MeResponse['views'] = {}
      const menuGroups: Record<string, boolean> = {}

      for (const v of resolvedViews) {
        views[v.viewCode] = { mask: v.mask, label: v.label, menuGroup: v.menuGroup }
        if (v.menuGroup) menuGroups[v.menuGroup] = true
      }

      const settings = normalizeTenantSettingsFromRow(settingsRows[0] ?? null)

      const subscription = subscriptionRows[0]

      const body: MeResponse = {
        user: {
          id: user.IdUsuario,
          name: user.Nombre,
          email: user.Email,
          admin: user.isAdmin === 1,
          area: user.IdArea ?? null,
          cityBase: user.IdBaseCiudad ?? null,
          department: user.IdDepartamento ?? null,
          position: user.IdPuesto ?? null,
          region: user.IdRegion ?? null,
          company: user.IdEmpresa ?? null
        },
        tenant: {
          id: tenantId,
          slug: tenantSlugOrDefault || tenant?.Dominio || sessionTenantId || '',
          name: tenant?.CompanyName ?? tenantNameOrDefault,
          isActive: tenant?.isActive === 1,
          plan: {
            name: (subscription?.PlanName as PlanTier) ?? null,
            displayName: subscription?.PlanDisplayName ?? null,
            status: (subscription?.Status as TenantSubscriptionStatus) ?? null
          }
        },
        settings,
        profile: profile
          ? { id: profile.Id, name: profile.Descripcion ?? null }
          : { id: null, name: null },
        views,
        menuGroups,
        planMenuGroups: Array.from(planModules),
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
