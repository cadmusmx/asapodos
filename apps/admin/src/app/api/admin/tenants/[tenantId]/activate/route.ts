import { NextRequest, NextResponse } from 'next/server'

import { requirePlatformRole } from '@gaso/shared'
import { activateTenant } from '@/services/tenant-service'

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
    const result = await activateTenant(
      tenantId,
      guard.userId,
      String(guard.platformRole)
    )

    if (!result.ok) {
      if (result.error === 'TENANT_NOT_FOUND') {
        return NextResponse.json({ message: ['Tenant not found'] }, { status: 404 })
      }
      if (result.error === 'CANNOT_ACTIVATE_INACTIVE_TENANT') {
        return NextResponse.json(
          { message: ['Cannot activate an inactive tenant'] },
          { status: 400 }
        )
      }
      if (result.error === 'ALREADY_ACTIVE') {
        return NextResponse.json(
          { message: ['Tenant is already active'] },
          { status: 400 }
        )
      }
      return NextResponse.json({ message: ['Failed to activate tenant'] }, { status: 500 })
    }

    return NextResponse.json({ tenantId: result.tenantId })
  } catch (error) {
    console.error('[ADMIN_ACTIVATE_TENANT_ERROR]', error)
    return NextResponse.json({ message: ['Internal server error'] }, { status: 500 })
  }
}
