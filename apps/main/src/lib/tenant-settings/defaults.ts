import type { TenantSettings } from '@/types/tenant-settings'

export const defaultTenantSettings: TenantSettings = {
  branding: {
    displayName: '',
    logoUrl: null,
    primaryColor: null
  },
  limits: {
    maxUsers: null,
    maxBranches: null,
    maxStorageMb: null,
    maxProjects: null
  },
  modules: {
    dashboard: false,
    warehouses: false,
    human_capital: false,
    projects: false,
    administration: false,
    operating_expenses: false,
    quotes: false,
    suppliers: false,
    vehicles: false
  }
}
