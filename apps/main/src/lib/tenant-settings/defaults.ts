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
  }
}
