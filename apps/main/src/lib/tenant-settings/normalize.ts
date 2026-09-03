import { defaultTenantSettings } from './defaults'

import type {
  TenantBrandingSettings,
  TenantLimitSettings,
  TenantModuleKey,
  TenantSettings
} from '@/types/tenant-settings'

export type TenantSettingsRow = {
  BrandingJson: string | null
  LimitsJson: string | null
}

export const tenantModuleKeys: TenantModuleKey[] = [
  'dashboard',
  'warehouses',
  'human_capital',
  'projects',
  'administration'
]

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const parseJsonRecord = (value: string | null | undefined): Record<string, unknown> => {
  if (!value) return {}

  try {
    const parsed = JSON.parse(value)

    return isRecord(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

const readNullableString = (value: unknown): string | null => {
  if (value === null || value === undefined) return null

  return typeof value === 'string' ? value : null
}

const readString = (value: unknown, fallback: string): string => (typeof value === 'string' ? value : fallback)

const readNullableNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) return null

  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

const sanitizeAssetUrl = (value: string | null): string | null => {
  if (!value || value === 'null' || value === 'undefined') return null

  const src = String(value).trim()

  if (!src) return null

  if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:image/')) {
    return src
  }

  return null
}

const normalizeBranding = (value: Record<string, unknown>): TenantBrandingSettings => ({
  displayName: readString(value.displayName, defaultTenantSettings.branding.displayName),
  logoUrl: sanitizeAssetUrl(readNullableString(value.logoUrl)),
  primaryColor: normalizePrimaryColor(readNullableString(value.primaryColor)),
  faviconUrl: sanitizeAssetUrl(readNullableString(value.faviconUrl)),
  fontFamily: readNullableString(value.fontFamily)
})

export const normalizePrimaryColor = (color: string | null): string | null => {
  if (!color) return null

  const hex = color.trim().toLowerCase()

  if (/^#[0-9a-f]{3}$/.test(hex) || /^#[0-9a-f]{6}$/.test(hex)) {
    return hex
  }

  return null
}

const normalizeLimits = (value: Record<string, unknown>): TenantLimitSettings => ({
  maxUsers: readNullableNumber(value.maxUsers),
  maxBranches: readNullableNumber(value.maxBranches),
  maxStorageMb: readNullableNumber(value.maxStorageMb),
  maxProjects: readNullableNumber(value.maxProjects)
})

export const normalizeTenantSettingsFromRow = (row?: TenantSettingsRow | null): TenantSettings => {
  if (!row) return defaultTenantSettings

  return {
    branding: normalizeBranding(parseJsonRecord(row.BrandingJson)),
    limits: normalizeLimits(parseJsonRecord(row.LimitsJson))
  }
}

export const serializeTenantSettings = (settings: TenantSettings) => ({
  brandingJson: JSON.stringify(settings.branding),
  limitsJson: JSON.stringify(settings.limits)
})
