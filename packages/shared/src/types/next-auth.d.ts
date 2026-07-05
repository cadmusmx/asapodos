import 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: User
  }

  interface User {
    id: number
    name: string
    email: string
    company: number
    profile: number
    admin: boolean
    area: number
    cityBase: number
    position: number
    region: number
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
    tenantId: string
    tenantSlug: string
    tenantName: string
    platformRole: PlatformRole | null
  }
}

export type PlatformRole = 'super_admin' | 'support' | 'auditor'
