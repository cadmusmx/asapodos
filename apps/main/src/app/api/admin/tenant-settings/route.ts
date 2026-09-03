import { NextResponse } from 'next/server'

import type { Prisma } from '@prisma/client'

import type { TenantRow } from '@gaso/shared/types/me'

import type { TenantSettings } from '@gaso/shared/types/tenant-settings'

import { withPermission, PERM, writeTransactionLog } from '@gaso/shared'

import type { TenantSettingsRow } from '@/lib/tenant-settings/normalize'
import {
  normalizeTenantSettingsFromRow,
  serializeTenantSettings,
  normalizePrimaryColor
} from '@/lib/tenant-settings/normalize'

export const runtime = 'nodejs'

type TenantSettingsBody = {
  settings?: TenantSettings
}

// export const GET = withPermission<TenantSettingsBody>(

export const GET = withPermission(
  'tenant_settings',
  async (req, rbac) => {
    const { auth, tenantId } = rbac
    const userId = auth.userId

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
            SELECT BrandingJson, LimitsJson
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
        appUser: auth.email ?? null,
        newData: { tenantId }
      }).catch(() => {})

      return NextResponse.json(result)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'

      if (message === 'TENANT_NOT_FOUND') {
        return NextResponse.json({ message: 'Tenant no encontrado' }, { status: 404 })
      }

      console.error('[TENANT_SETTINGS_GET_ERROR]', message)

      return NextResponse.json({ message: 'Error al cargar configuración del tenant' }, { status: 500 })
    }
  },
  { bit: PERM.R }
)

// export const PUT = withPermission<TenantSettingsBody>(

export const PUT = withPermission(
  'tenant_settings',
  async (req, rbac) => {
    const { auth, tenantId } = rbac
    const userId = auth.userId

    let body: TenantSettingsBody

    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ message: 'JSON inválido' }, { status: 400 })
    }

    if (!body.settings) {
      return NextResponse.json({ message: 'Configuración requerida' }, { status: 400 })
    }

    const incomingBranding = body.settings.branding
    const validatedPrimaryColor = normalizePrimaryColor(incomingBranding.primaryColor ?? null)

    const normalizedSettings: TenantSettings = {
      ...body.settings,
      branding: {
        ...incomingBranding,
        primaryColor: validatedPrimaryColor
      }
    }

    const serializedSettings = serializeTenantSettings(normalizedSettings)

    try {
      let oldBranding = normalizedSettings.branding

      const result = await withTenantSettingsContext(tenantId, async tx => {
        const [oldRows, tenantRows] = await Promise.all([
          tx.$queryRaw<TenantSettingsRow[]>`
            SELECT BrandingJson, LimitsJson
            FROM Security.TenantSettings
            WHERE TenantID = CAST(${tenantId} AS uniqueidentifier)
          `,
          tx.$queryRaw<TenantRow[]>`
            SELECT
            TenantID,
            CompanyName,
            CAST(CASE WHEN Status IN ('ACTIVE', 'TRIAL') THEN 1 ELSE 0 END AS bit) AS isActive,
            Dominio
            FROM Security.Tenants
            WHERE TenantID = CAST(${tenantId} AS uniqueidentifier)
          `
        ])

        const oldSettings = normalizeTenantSettingsFromRow(oldRows[0] ?? null)

        oldBranding = oldSettings.branding

        const tenant = tenantRows[0]

        if (!tenant) throw new Error('TENANT_NOT_FOUND')

        await tx.$executeRaw`
          MERGE Security.TenantSettings AS target
          USING (
            SELECT
              CAST(${tenantId} AS uniqueidentifier) AS TenantID,
              ${serializedSettings.brandingJson} AS BrandingJson,
              ${serializedSettings.limitsJson} AS LimitsJson,
              ${userId} AS UpdatedBy
          ) AS source
          ON target.TenantID = source.TenantID
          WHEN MATCHED THEN
            UPDATE SET
              BrandingJson = source.BrandingJson,
              LimitsJson = source.LimitsJson,
              UpdatedAt = SYSUTCDATETIME(),
              UpdatedBy = source.UpdatedBy
          WHEN NOT MATCHED THEN
            INSERT (TenantID, BrandingJson, LimitsJson, UpdatedBy)
            VALUES (source.TenantID, source.BrandingJson, source.LimitsJson, source.UpdatedBy);
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
        appUser: auth.email ?? null,
        oldData: { branding: oldBranding },
        newData: { branding: normalizedSettings.branding },
        idOrigin: 1
      }).catch(() => {})

      return NextResponse.json(result)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'

      if (message === 'TENANT_NOT_FOUND') {
        return NextResponse.json({ message: 'Tenant no encontrado' }, { status: 404 })
      }

      console.error('[TENANT_SETTINGS_PUT_ERROR]', message)

      return NextResponse.json({ message: 'Error al guardar configuración del tenant' }, { status: 500 })
    }
  },
  { bit: PERM.U }
)

async function withTenantSettingsContext<T>(
  tenantId: string,
  callback: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  const { prisma } = await import('@/lib/prisma')

  return prisma.$transaction(
    async tx => {
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
    },
    {
      maxWait: 15000,
      timeout: 30000
    }
  )
}
