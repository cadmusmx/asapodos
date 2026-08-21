import { unstable_cache } from 'next/cache'
import { headers } from 'next/headers'

import { getTenantIdFromHeaders, withTenantContext } from '@gaso/shared'

import { normalizeTenantSettingsFromRow, type TenantSettingsRow } from '@/lib/tenant-settings/normalize'

import type { TenantBrandingSettings } from '@/types/tenant-settings'

const getBrandingByTenantId = unstable_cache(
  async (tenantId: string): Promise<TenantBrandingSettings> => {
    const row = await withTenantContext(tenantId, tx =>
      tx.$queryRaw<TenantSettingsRow[]>`
        SELECT BrandingJson, LimitsJson
        FROM Security.TenantSettings
        WHERE TenantID = CAST(${tenantId} AS uniqueidentifier)
      `
    )

    return normalizeTenantSettingsFromRow(row[0] ?? null).branding
  },
  ['public-tenant-branding'],
  { revalidate: Number(process.env.TENANT_CACHE_TTL_SECONDS) || 300, tags: ['tenant'] }
)

export async function getPublicBranding(): Promise<TenantBrandingSettings | null> {
  const tenantId = getTenantIdFromHeaders(await headers())

  if (!tenantId) return null

  try {
    return await getBrandingByTenantId(tenantId)
  } catch {
    return null
  }
}
