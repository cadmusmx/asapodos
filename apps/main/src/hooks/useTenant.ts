'use client'

import { useSession } from 'next-auth/react'
import type { User } from 'next-auth'

export interface TenantInfo {
  tenantId: string
  tenantSlug: string
  tenantName: string
}

export function useTenant(): TenantInfo | null {
  const { data } = useSession()

  if (!data?.user) return null

  const user = data.user as User & { tenantId: string; tenantSlug: string; tenantName: string }

  if (!user.tenantId || user.tenantId === '00000000-0000-0000-0000-000000000000') {
    return null
  }

  return {
    tenantId: user.tenantId,
    tenantSlug: user.tenantSlug,
    tenantName: user.tenantName
  } as TenantInfo
}
