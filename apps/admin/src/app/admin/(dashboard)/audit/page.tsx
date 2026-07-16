import { redirect } from 'next/navigation'

import Box from '@mui/material/Box'
import { requirePlatformRole } from '@gaso/shared'
import { getGlobalAuditLog } from '@/services/audit-service'
import { getAdminTenantId } from '@/services/admin-tenant'
import AuditFilters from '@/components/audit/AuditFilters'
import AuditTable from '@/components/audit/AuditTable'
import AuditPageHeader from '@/components/audit/AuditPageHeader'

export const dynamic = 'force-dynamic'

interface AuditPageProps {
  searchParams: Promise<{
    page?: string
    pageSize?: string
    tenantId?: string
    tableName?: string
    action?: string
    appUser?: string
    startDate?: string
    endDate?: string
  }>
}

export default async function AuditPage({ searchParams }: AuditPageProps) {
  const guard = await requirePlatformRole(['super_admin', 'auditor'])

  if (!guard.ok) {
    redirect('/admin/login')
  }

  const params = await searchParams

  const needsRedirect = !params.tenantId || (!params.startDate && !params.endDate)

  if (needsRedirect) {
    const url = new URLSearchParams()
    if (!params.tenantId) {
      const adminTenantId = await getAdminTenantId()
      url.set('tenantId', adminTenantId)
    } else {
      url.set('tenantId', params.tenantId)
    }

    if (!params.startDate || !params.endDate) {
      const now = new Date()
      const yyyy = now.getFullYear()
      const mm = String(now.getMonth() + 1).padStart(2, '0')
      const dd = String(now.getDate()).padStart(2, '0')
      const today = `${yyyy}-${mm}-${dd}`
      const thirtyDaysAgo = new Date(now)
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const agoYyyy = thirtyDaysAgo.getFullYear()
      const agoMm = String(thirtyDaysAgo.getMonth() + 1).padStart(2, '0')
      const agoDd = String(thirtyDaysAgo.getDate()).padStart(2, '0')
      url.set('startDate', `${agoYyyy}-${agoMm}-${agoDd}`)
      url.set('endDate', today)
    } else {
      if (params.startDate) url.set('startDate', params.startDate)
      if (params.endDate) url.set('endDate', params.endDate)
    }

    if (params.page) url.set('page', params.page)
    if (params.pageSize) url.set('pageSize', params.pageSize)
    if (params.tableName) url.set('tableName', params.tableName)
    if (params.action) url.set('action', params.action)
    if (params.appUser) url.set('appUser', params.appUser)
    redirect(`/admin/audit?${url.toString()}`)
  }

  const page = Math.max(1, Number(params.page) || 1)
  const pageSize = Math.max(25, Number(params.pageSize) || 50)

  const tenantId = params.tenantId!
  const startDate = params.startDate!
  const endDate = params.endDate!

  const { entries, total } = await getGlobalAuditLog({
    page,
    pageSize,
    tenantId,
    tableName: params.tableName || null,
    action: params.action || null,
    appUser: params.appUser || null,
    startDate: new Date(startDate + 'T00:00:00'),
    endDate: new Date(endDate + 'T23:59:59.999')
  })

  return (
    <Box>
      <AuditPageHeader />

      <AuditFilters />

      <AuditTable
        entries={entries}
        total={total}
        page={page}
        pageSize={pageSize}
        tenantId={tenantId}
        tableName={params.tableName || null}
        action={params.action || null}
        appUser={params.appUser || null}
        startDate={startDate}
        endDate={endDate}
      />
    </Box>
  )
}
