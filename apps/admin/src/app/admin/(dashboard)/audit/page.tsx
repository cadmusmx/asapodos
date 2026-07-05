import { redirect } from 'next/navigation'

import Box from '@mui/material/Box'
import { requirePlatformRole } from '@gaso/shared'
import { getGlobalAuditLog } from '@/services/audit-service'
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
  const guard = await requirePlatformRole('super_admin')

  if (!guard.ok) {
    redirect('/admin/login')
  }

  const params = await searchParams
  const page = Math.max(1, Number(params.page) || 1)
  const pageSize = Math.max(25, Number(params.pageSize) || 50)

  const { entries, total } = await getGlobalAuditLog({
    page,
    pageSize,
    tenantId: params.tenantId || null,
    tableName: params.tableName || null,
    action: params.action || null,
    appUser: params.appUser || null,
    startDate: params.startDate ? new Date(params.startDate) : null,
    endDate: params.endDate ? new Date(params.endDate) : null
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
        tenantId={params.tenantId || null}
        tableName={params.tableName || null}
        action={params.action || null}
        appUser={params.appUser || null}
        startDate={params.startDate || null}
        endDate={params.endDate || null}
      />
    </Box>
  )
}
