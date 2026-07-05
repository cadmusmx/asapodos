import { redirect } from 'next/navigation'

import { requirePlatformRole } from '@gaso/shared'
import { listTenants, type TenantStatus } from '@/services/tenant-service'
import TenantsPageClient from '@/components/tenants/TenantsPageClient'

export const dynamic = 'force-dynamic'

const ADMIN_TENANT_DOMAIN = process.env.ADMIN_TENANT

interface TenantsPageProps {
  searchParams: Promise<{
    page?: string
    pageSize?: string
    status?: string
    search?: string
    sort?: string
    dir?: string
  }>
}

export default async function TenantsPage({ searchParams }: TenantsPageProps) {
  const guard = await requirePlatformRole('super_admin')

  if (!guard.ok) {
    redirect('/admin/login')
  }

  const params = await searchParams
  const page = Number(params.page) || 1
  const pageSize = Number(params.pageSize) || 20
  const status = (params.status as TenantStatus) || null
  const search = params.search || null
  const sort = params.sort || 'CreatedAt'
  const dir = (params.dir as 'asc' | 'desc') || 'desc'

  const { tenants, total } = await listTenants({ page, pageSize, status, search, sortField: sort, sortDir: dir })

  return (
    <TenantsPageClient
      tenants={tenants}
      total={total}
      page={page - 1}
      pageSize={pageSize}
      status={status}
      search={search}
      adminTenantDomain={ADMIN_TENANT_DOMAIN}
    />
  )
}
