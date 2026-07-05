import type { TenantSettings } from '@/types/tenant-settings'

export const defaultTenantSettings: TenantSettings = {
  branding: {
    displayName: '',
    logoUrl: null,
    primaryColor: null
  },
  modules: {
    dashboard: true,
    warehouses: false,
    human_capital: true,
    projects: false,
    administration: false,
    operating_expenses: false,
    quotes: false,
    suppliers: false,
    vehicles: false
  },
  limits: {
    maxUsers: null,
    maxStorageMb: null,
    maxProjects: null
  }
}
