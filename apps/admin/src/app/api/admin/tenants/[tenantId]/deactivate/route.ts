import { NextRequest, NextResponse } from 'next/server'

import { requirePlatformRole } from '@gaso/shared'
import { deactivateTenant } from '@/services/tenant-service'

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
    const result = await deactivateTenant(
      tenantId,
      guard.userId,
      String(guard.platformRole)
    )

    if (!result.ok) {
      if (result.error === 'TENANT_NOT_FOUND') {
        return NextResponse.json({ message: ['Tenant not found'] }, { status: 404 })
      }
      if (result.error === 'ALREADY_INACTIVE') {
        return NextResponse.json(
          { message: ['Tenant is already inactive'] },
          { status: 400 }
        )
      }
      return NextResponse.json({ message: ['Failed to deactivate tenant'] }, { status: 500 })
    }

    return NextResponse.json({ tenantId: result.tenantId })
  } catch (error) {
    console.error('[ADMIN_DEACTIVATE_TENANT_ERROR]', error)
    return NextResponse.json({ message: ['Internal server error'] }, { status: 500 })
  }
}
