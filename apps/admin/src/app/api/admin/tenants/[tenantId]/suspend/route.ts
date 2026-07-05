import { NextRequest, NextResponse } from 'next/server'

import { requirePlatformRole } from '@gaso/shared'
import { suspendTenant } from '@/services/tenant-service'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const guard = await requirePlatformRole('super_admin')

  if (!guard.ok) {
    return NextResponse.json({ message: guard.message }, { status: guard.status })
  }

  const { tenantId } = await params

  if (!tenantId) {
    return NextResponse.json({ message: ['tenantId is required'] }, { status: 400 })
  }

  try {
    const body = await req.json()
    const { reason } = body

    if (!reason) {
      return NextResponse.json(
        { message: ['Reason is required for suspension'] },
        { status: 400 }
      )
    }

    const result = await suspendTenant(
      tenantId,
      guard.userId,
      String(guard.platformRole),
      reason
    )

    if (!result.ok) {
      if (result.error === 'TENANT_NOT_FOUND') {
        return NextResponse.json({ message: ['Tenant not found'] }, { status: 404 })
      }
      if (result.error === 'CANNOT_SUSPEND_INACTIVE_TENANT') {
        return NextResponse.json(
          { message: ['Cannot suspend an inactive tenant'] },
          { status: 400 }
        )
      }
      if (result.error === 'ALREADY_SUSPENDED') {
        return NextResponse.json(
          { message: ['Tenant is already suspended'] },
          { status: 400 }
        )
      }
      return NextResponse.json({ message: ['Failed to suspend tenant'] }, { status: 500 })
    }

    return NextResponse.json({ tenantId: result.tenantId })
  } catch (error) {
    console.error('[ADMIN_SUSPEND_TENANT_ERROR]', error)
    return NextResponse.json({ message: ['Internal server error'] }, { status: 500 })
  }
}
