import { redirect } from 'next/navigation'

import { requirePlatformRole } from '@gaso/shared'
import { listPlatformUsers, getOldestPlatformUserId } from '@/services/platform-user-service'
import type { PlatformRole } from '@gaso/shared'
import UsersPageClient from '@/components/users/UsersPageClient'

export const dynamic = 'force-dynamic'

interface UsersPageProps {
  searchParams: Promise<{
    page?: string
    pageSize?: string
    role?: string
    search?: string
  }>
}

export default async function UsersPage({ searchParams }: UsersPageProps) {
  const guard = await requirePlatformRole('super_admin')

  if (!guard.ok) {
    redirect('/admin/login')
  }

  const params = await searchParams
  const page = Number(params.page) || 1
  const pageSize = Number(params.pageSize) || 20
  const role = (params.role as PlatformRole) || null
  const search = params.search || null

  const [{ users, total }, oldestUserId] = await Promise.all([
    listPlatformUsers({ page, pageSize, role, search }),
    getOldestPlatformUserId()
  ])

  return (
    <UsersPageClient
      users={users}
      total={total}
      page={page - 1}
      pageSize={pageSize}
      role={role}
      search={search}
      oldestUserId={oldestUserId}
    />
  )
}
