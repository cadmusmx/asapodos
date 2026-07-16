import { NextRequest, NextResponse } from 'next/server'

import { requirePlatformRole } from '@gaso/shared'
import { getGlobalAuditLog } from '@/services/audit-service'

export async function GET(req: NextRequest) {
  const guard = await requirePlatformRole(['super_admin', 'auditor'])

  if (!guard.ok) {
    return NextResponse.json({ message: guard.message }, { status: guard.status })
  }

  const { searchParams } = new URL(req.url)
  const page = Number(searchParams.get('page')) || 1
  const pageSize = Number(searchParams.get('pageSize')) || 50
  const tenantId = searchParams.get('tenantId')
  const tableName = searchParams.get('tableName')
  const action = searchParams.get('action')
  const appUser = searchParams.get('appUser')
  const startDateStr = searchParams.get('startDate')
  const endDateStr = searchParams.get('endDate')

  if (!tenantId) {
    return NextResponse.json({ message: ['tenantId query parameter is required'] }, { status: 400 })
  }

  const startDate = startDateStr ? new Date(startDateStr) : null
  const endDate = endDateStr ? new Date(endDateStr) : null

  try {
    const result = await getGlobalAuditLog({
      page,
      pageSize,
      tenantId,
      tableName,
      action,
      appUser,
      startDate,
      endDate
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('[ADMIN_GET_GLOBAL_AUDIT_ERROR]', error)
    return NextResponse.json({ message: ['Internal server error'] }, { status: 500 })
  }
}
