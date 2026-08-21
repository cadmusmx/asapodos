import type { TenantSettings } from './tenant-settings'
import type { PlanFeatureKey, PlanTier, TenantSubscriptionStatus } from './plan'

export type MeResponse = {
  user: {
    id: number
    user: string
    name: string
    email: string | null
    phone: string | null
    area: number | null
    areaName: string | null
    department: number | null
    departmentName: string | null
    position: number | null
    positionName: string | null
    region: number | null
    profilePhoto: string | null
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
  Usuario: string
  Nombre: string
  Email: string | null   // Employees.Email puede ser NULL
  Phone: string | null
  FotoPerfil: string | null
  IdArea: number | null
  Area: string | null
  IdDepartamento: number | null
  Departamento: string | null
  IdPuesto: number | null
  Puesto: string | null
  IdRegion: number | null
}
