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

export type TenantLimitSettings = {
  maxUsers: number | null
  maxBranches: number | null
  maxStorageMb: number | null
  maxProjects: number | null
}

export type TenantSettings = {
  branding: TenantBrandingSettings
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
