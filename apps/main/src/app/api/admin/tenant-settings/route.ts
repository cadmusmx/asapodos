import { NextResponse } from 'next/server'

import type { Prisma } from '@prisma/client'

import { getServerSession } from 'next-auth'

import { authOptions } from '@/libs/auth'
import { getTenantFromHeaders } from '@/lib/tenant-context'
import { writeTransactionLog } from '@/lib/audit/transaction-log'
import {
  normalizeTenantSettingsFromRow,
  serializeTenantSettings
} from '@/lib/tenant-settings/normalize'

import type { TenantSettings } from '@/types/tenant-settings'

export const runtime = 'nodejs'

type TenantSettingsRow = {
  BrandingJson: string | null
  ModulesJson: string | null
  LimitsJson: string | null
}

type TenantRow = {
  TenantID: string
  CompanyName: string | null
  isActive: boolean
  Dominio: string | null
}

type TenantSettingsBody = {
  settings?: TenantSettings
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 })
  }

  const { id: userId, tenantId: sessionTenantId } = session.user

  if (!userId || typeof userId !== 'number') {
    return NextResponse.json({ message: 'Sesión sin identificador de usuario válido' }, { status: 401 })
  }

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

  try {
    const result = await withTenantSettingsContext(tenantId, async tx => {
      const [tenantRows, settingsRows] = await Promise.all([
        tx.$queryRaw<TenantRow[]>`
          SELECT
          TenantID,
          CompanyName,
          CAST(CASE WHEN Status IN ('ACTIVE', 'TRIAL') THEN 1 ELSE 0 END AS bit) AS isActive,
          Dominio
          FROM Security.Tenants
          WHERE TenantID = CAST(${tenantId} AS uniqueidentifier)
        `,
        tx.$queryRaw<TenantSettingsRow[]>`
          SELECT BrandingJson, ModulesJson, LimitsJson
          FROM Security.TenantSettings
          WHERE TenantID = CAST(${tenantId} AS uniqueidentifier)
        `
      ])

      const tenant = tenantRows[0]

      if (!tenant) throw new Error('TENANT_NOT_FOUND')

      return {
        tenant: {
          id: tenantId,
          slug: tenant.Dominio ?? '',
          name: tenant.CompanyName ?? '',
          isActive: tenant.isActive
        },
        settings: normalizeTenantSettingsFromRow(settingsRows[0] ?? null)
      }
    })

    writeTransactionLog({
      tenantId,
      tableName: 'Security.TenantSettings',
      action: 'READ',
      userId,
      appUser: session.user.email ?? null,
      newData: { tenantId }
    }).catch(() => { })

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    if (message === 'TENANT_NOT_FOUND') {
      return NextResponse.json({ message: 'Tenant no encontrado' }, { status: 404 })
    }

    console.error('[TENANT_SETTINGS_GET_ERROR]', message)

    return NextResponse.json({ message: 'Error al cargar configuración del tenant' }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 })
  }

  const { id: userId, tenantId: sessionTenantId, admin } = session.user

  if (!userId || typeof userId !== 'number') {
    return NextResponse.json({ message: 'Sesión sin identificador de usuario válido' }, { status: 401 })
  }

  if (admin !== true) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 403 })
  }

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

  let body: TenantSettingsBody

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ message: 'JSON inválido' }, { status: 400 })
  }

  if (!body.settings) {
    return NextResponse.json({ message: 'Configuración requerida' }, { status: 400 })
  }

  const normalizedSettings = normalizeTenantSettingsFromRow({
    BrandingJson: JSON.stringify(body.settings.branding),
    ModulesJson: JSON.stringify(body.settings.modules),
    LimitsJson: JSON.stringify(body.settings.limits)
  })

  const serializedSettings = serializeTenantSettings(normalizedSettings)

  try {
    const result = await withTenantSettingsContext(tenantId, async tx => {
      const tenantRows = await tx.$queryRaw<TenantRow[]>`
        SELECT
        TenantID,
        CompanyName,
        CAST(CASE WHEN Status IN ('ACTIVE', 'TRIAL') THEN 1 ELSE 0 END AS bit) AS isActive,
        Dominio
        FROM Security.Tenants
        WHERE TenantID = CAST(${tenantId} AS uniqueidentifier)
      `

      const tenant = tenantRows[0]

      if (!tenant) throw new Error('TENANT_NOT_FOUND')

      await tx.$executeRaw`
        MERGE Security.TenantSettings AS target
        USING (
          SELECT
            CAST(${tenantId} AS uniqueidentifier) AS TenantID,
            ${serializedSettings.brandingJson} AS BrandingJson,
            ${serializedSettings.modulesJson} AS ModulesJson,
            ${serializedSettings.limitsJson} AS LimitsJson,
            ${userId} AS UpdatedBy
        ) AS source
        ON target.TenantID = source.TenantID
        WHEN MATCHED THEN
          UPDATE SET
            BrandingJson = source.BrandingJson,
            ModulesJson = source.ModulesJson,
            LimitsJson = source.LimitsJson,
            UpdatedAt = SYSUTCDATETIME(),
            UpdatedBy = source.UpdatedBy
        WHEN NOT MATCHED THEN
          INSERT (TenantID, BrandingJson, ModulesJson, LimitsJson, UpdatedBy)
          VALUES (source.TenantID, source.BrandingJson, source.ModulesJson, source.LimitsJson, source.UpdatedBy);
      `

      return {
        tenant: {
          id: tenantId,
          slug: tenant.Dominio ?? '',
          name: tenant.CompanyName ?? '',
          isActive: tenant.isActive
        },
        settings: normalizedSettings
      }
    })

    writeTransactionLog({
      tenantId,
      tableName: 'Security.TenantSettings',
      action: 'UPDATE',
      userId,
      appUser: session.user.email ?? null,
      newData: result.settings
    }).catch(() => { })

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    if (message === 'TENANT_NOT_FOUND') {
      return NextResponse.json({ message: 'Tenant no encontrado' }, { status: 404 })
    }

    console.error('[TENANT_SETTINGS_PUT_ERROR]', message)

    return NextResponse.json({ message: 'Error al guardar configuración del tenant' }, { status: 500 })
  }
}

async function withTenantSettingsContext<T>(
  tenantId: string,
  callback: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  const { prisma } = await import('@/lib/prisma')

  return prisma.$transaction(async tx => {
    const [contextRows] = await tx.$queryRawUnsafe<Array<{ CurrentTenantID: string | null }>>(
      `SELECT CONVERT(nvarchar(100), SESSION_CONTEXT(N'TenantID')) AS CurrentTenantID`
    )

    const currentTenantId = contextRows?.CurrentTenantID ?? null

    if (currentTenantId?.toLowerCase() === tenantId.toLowerCase()) {
      return callback(tx)
    }

    if (currentTenantId && currentTenantId.toLowerCase() !== tenantId.toLowerCase()) {
      throw new Error('UNAUTHORIZED')
    }

    await tx.$executeRawUnsafe(`EXEC sp_SetTenantContext @TenantID = '${tenantId.replace(/'/g, "''")}'`)

    return callback(tx)
  }, {
    maxWait: 15000,
    timeout: 30000
  })
}
