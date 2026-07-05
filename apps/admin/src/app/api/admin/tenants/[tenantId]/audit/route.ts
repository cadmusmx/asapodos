import { NextRequest, NextResponse } from 'next/server'

import { requirePlatformRole } from '@gaso/shared'
import { getTenantAuditLog } from '@/services/audit-service'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const guard = await requirePlatformRole()

  if (!guard.ok) {
    return NextResponse.json({ message: guard.message }, { status: guard.status })
  }

  const { tenantId } = await params

  if (!tenantId) {
    return NextResponse.json({ message: ['tenantId is required'] }, { status: 400 })
  }

  const { searchParams } = new URL(req.url)
  const page = Number(searchParams.get('page')) || 1
  const pageSize = Number(searchParams.get('pageSize')) || 50

  try {
    const result = await getTenantAuditLog({ page, pageSize, tenantId })

    return NextResponse.json(result)
  } catch (error) {
    console.error('[ADMIN_GET_TENANT_AUDIT_ERROR]', error)
    return NextResponse.json({ message: ['Internal server error'] }, { status: 500 })
  }
}
