import type { PlatformRole } from '@gaso/shared'

export type { PlatformRole }

export interface ListPlatformUsersOptions {
  page: number
  pageSize: number
  role?: PlatformRole | null
  search?: string | null
}

export interface PlatformUserRow {
  UserID: number
  Usuario: string
  Nombre: string
  Email: string | null
  Role: PlatformRole
  CreatedAt: Date | null
  CreatedBy: number | null
  Estatus: string
}

export interface PlatformUserListResult {
  users: PlatformUserRow[]
  total: number
}

export interface CreateUserInput {
  nombre: string
  apellidos: string
  usuario: string
  email: string
  password: string
  role: PlatformRole
}

export interface SearchUserRow {
  UserID: number
  Usuario: string
  Nombre: string
  Email: string | null
  Estatus: string
  hasRole: number
}

export interface UpdatePlatformUserOptions {
  userId: number
  nombre?: string      // → FirstName
  apellidos?: string   // → LastName
  email?: string
  adminUserId: number
  adminEmail: string
}

export interface AddPlatformRoleOptions {
  userId: number
  role: PlatformRole
  adminUserId: number
  adminEmail: string
}
