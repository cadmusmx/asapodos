import type { TenantSettings } from './tenant-settings'
import type { PlanFeatureKey, PlanTier, TenantSubscriptionStatus } from './plan'
import { EmployeeDocument } from './human-capital'

export type MeResponse = {
  user: {
    id: number
    name: string
    email: string | null
    area: number | null
    department: number | null
    position: number | null
    region: number | null
  }
  tenant: {
    id: string
    slug: string
    name: string
    isActive: boolean
    plan: {
      name: PlanTier | null
      displayName: string | null
      status: TenantSubscriptionStatus | null
    }
  }
  settings: TenantSettings
  views: Record<string, { mask: number; label: string; menuGroup: string | null }>
  menuGroups: Record<string, boolean>
  planMenuGroups: PlanFeatureKey[]
}

export type TenantRow = {
  TenantID: string
  CompanyName: string | null
  isActive: number
  Dominio: string | null
}

export type UserRow = {
  IdUsuario: number
  Nombre: string
  Email: string | null   // Employees.Email puede ser NULL
  IdArea: number | null
  IdDepartamento: number | null
  IdPuesto: number | null
  IdRegion: number | null
}
