import type { TenantSettings } from './tenant-settings'

export type MePermission = {
  moduleId: number
  moduleName: string
  subModules: Array<{
    id: number
    name: string
  }>
}

export type MeResponse = {
  user: {
    id: number
    name: string
    email: string
    admin: boolean
    area: number | null
    cityBase: number | null
    departament: number | null
    position: number | null
    region: number | null
    company: number | null
  }
  tenant: {
    id: string
    slug: string
    name: string
    isActive: boolean
  }
  profile: {
    id: number | null
    name: string | null
  }
  permissions: MePermission[]
  settings: TenantSettings
  views: Record<string, { mask: number; label: string; menuGroup: string | null }>
  menuGroups: Record<string, boolean>
}

export type ModuleRow = {
  IdModulo: number
  NombreModulo: string | null
  IdSubModulo: number | null
  NombreSubModulo: string | null
}

export type ProfileRow = {
  Id: number
  Descripcion: string | null
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
  Email: string
  IdPerfil: number | null
  isAdmin: number | null
  IdArea: number | null
  IdBaseCiudad: number | null
  IdDepartamento: number | null
  IdPuesto: number | null
  IdRegion: number | null
  IdEmpresa: number | null
}
