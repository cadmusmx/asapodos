import 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: User
  }

  interface User {
    id: number
    employeeId: number // nuevo
    name: string
    email: string | null
    area: number | null
    department: number | null // + para paridad con /api/me
    position: number | null
    region: number | null
    image: string
    tenantId: string
    tenantSlug: string
    tenantName: string
    platformRole: PlatformRole | null
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: number
    employeeId: number // nuevo
    tenantId: string
    tenantSlug: string
    tenantName: string
    platformRole: PlatformRole | null
  }
}

export type PlatformRole = 'super_admin' | 'support' | 'auditor'
