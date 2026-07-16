import { NextRequest, NextResponse } from 'next/server'
import { requirePlatformRole } from '@gaso/shared'
import { getGlobalAuditLog } from '@/services/audit-service'
import { AUDIT_ACTION_LABELS, type AuditActionCode } from '@gaso/shared'

export async function GET(request: NextRequest) {
  const guard = await requirePlatformRole(['super_admin', 'auditor'])
  if (!guard.ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const tenantId = searchParams.get('tenantId')
  const tableName = searchParams.get('tableName') || undefined
  const action = searchParams.get('action') || undefined
  const appUser = searchParams.get('appUser') || undefined
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')

  if (!tenantId) {
    return NextResponse.json({ error: 'tenantId is required' }, { status: 400 })
  }

  const { entries } = await getGlobalAuditLog({
    page: 1,
    pageSize: 10000,
    tenantId,
    tableName: tableName || null,
    action: action || null,
    appUser: appUser || null,
    startDate: startDate ? new Date(startDate) : null,
    endDate: endDate ? new Date(endDate) : null
  })

  const headers = ['Fecha', 'Tenant', 'Usuario', 'Tabla', 'Accion', 'App User', 'TenantID']
  const rows = entries.map(entry => [
    entry.changedAt ? new Date(entry.changedAt).toISOString() : '',
    entry.tenantName || '',
    entry.userId?.toString() || '',
    entry.tableName || '',
    AUDIT_ACTION_LABELS[entry.action as AuditActionCode] || entry.action,
    entry.appUser || '',
    entry.tenantId || ''
  ])

  const csv = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const filename = `audit-log-${new Date().toISOString().split('T')[0]}.csv`

  return new NextResponse(blob, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}"`
    }
  })
}
