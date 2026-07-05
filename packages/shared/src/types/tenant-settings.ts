export type TenantModuleKey =
  | 'dashboard'
  | 'warehouses'
  | 'human_capital'
  | 'projects'
  | 'administration'
  | 'operating_expenses'
  | 'quotes'
  | 'suppliers'
  | 'vehicles'

export type TenantBrandingSettings = {
  displayName: string
  logoUrl: string | null
  primaryColor: string | null
}

export type TenantModuleSettings = Record<TenantModuleKey, boolean>

export type TenantLimitSettings = {
  maxUsers: number | null
  maxStorageMb: number | null
  maxProjects: number | null
}

export type TenantSettings = {
  branding: TenantBrandingSettings
  modules: TenantModuleSettings
  limits: TenantLimitSettings
}

export type TenantSettingsResponse = {
  tenant: {
    id: string
    slug: string
    name: string
    isActive: boolean
  }
  settings: TenantSettings
}
