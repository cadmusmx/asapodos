import { NextRequest, NextResponse } from 'next/server'

import { requirePlatformRole } from '@gaso/shared'
import { getTenantById, updateTenant } from '@/services/tenant-service'

export async function GET(
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

  const tenant = await getTenantById(tenantId)

  if (!tenant) {
    return NextResponse.json({ message: ['Tenant not found'] }, { status: 404 })
  }

  return NextResponse.json({ tenant })
}

export async function PUT(
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
    const { companyName, dominio, subscriptionPlan, maxUsers, region } = body

    const result = await updateTenant({
      tenantId,
      companyName,
      dominio,
      subscriptionPlan: subscriptionPlan === '' ? null : subscriptionPlan,
      maxUsers: maxUsers === '' ? null : maxUsers ? Number(maxUsers) : undefined,
      region: region === '' ? null : region,
      adminUserId: guard.userId,
      adminEmail: String(guard.platformRole)
    })

    if (!result.ok) {
      if (result.error === 'TENANT_NOT_FOUND') {
        return NextResponse.json({ message: ['Tenant not found'] }, { status: 404 })
      }
      return NextResponse.json({ message: ['Failed to update tenant'] }, { status: 500 })
    }

    return NextResponse.json({ tenantId: result.tenantId })
  } catch (error) {
    console.error('[ADMIN_UPDATE_TENANT_ERROR]', error)
    return NextResponse.json({ message: ['Internal server error'] }, { status: 500 })
  }
}
