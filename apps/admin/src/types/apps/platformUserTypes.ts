import type { PlatformRole } from '@gaso/shared'

export type { PlatformRole }

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
