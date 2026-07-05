import { defaultTenantSettings } from './defaults'

import type {
  TenantBrandingSettings,
  TenantLimitSettings,
  TenantModuleKey,
  TenantModuleSettings,
  TenantSettings
} from '@/types/tenant-settings'

export type TenantSettingsRow = {
  BrandingJson: string | null
  ModulesJson: string | null
  LimitsJson: string | null
}

export const tenantModuleKeys: TenantModuleKey[] = [
  'dashboard',
  'warehouses',
  'human_capital',
  'projects',
  'administration',
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

const readString = (value: unknown, fallback: string): string =>
  typeof value === 'string' ? value : fallback

const readNullableNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) return null

  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

const normalizeBranding = (value: Record<string, unknown>): TenantBrandingSettings => ({
  displayName: readString(value.displayName, defaultTenantSettings.branding.displayName),
  logoUrl: readNullableString(value.logoUrl),
  primaryColor: readNullableString(value.primaryColor)
})

const normalizeModules = (value: Record<string, unknown>): TenantModuleSettings => {
  return tenantModuleKeys.reduce<TenantModuleSettings>((settings, moduleKey) => {
    const moduleValue = value[moduleKey]

    settings[moduleKey] =
      typeof moduleValue === 'boolean'
        ? moduleValue
        : defaultTenantSettings.modules[moduleKey]

    return settings
  }, { ...defaultTenantSettings.modules })
}

const normalizeLimits = (value: Record<string, unknown>): TenantLimitSettings => ({
  maxUsers: readNullableNumber(value.maxUsers),
  maxStorageMb: readNullableNumber(value.maxStorageMb),
  maxProjects: readNullableNumber(value.maxProjects)
})

export const normalizeTenantSettingsFromRow = (row?: TenantSettingsRow | null): TenantSettings => {
  if (!row) return defaultTenantSettings

  return {
    branding: normalizeBranding(parseJsonRecord(row.BrandingJson)),
    modules: normalizeModules(parseJsonRecord(row.ModulesJson)),
    limits: normalizeLimits(parseJsonRecord(row.LimitsJson))
  }
}

export const serializeTenantSettings = (settings: TenantSettings) => ({
  brandingJson: JSON.stringify(settings.branding),
  modulesJson: JSON.stringify(settings.modules),
  limitsJson: JSON.stringify(settings.limits)
})
