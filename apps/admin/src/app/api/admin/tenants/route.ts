import { NextRequest, NextResponse } from 'next/server'

import { requirePlatformRole } from '@gaso/shared'
import { listTenants, createTenant, type TenantStatus } from '@/services/tenant-service'

export async function GET(req: NextRequest) {
  const guard = await requirePlatformRole('super_admin')

  if (!guard.ok) {
    return NextResponse.json({ message: guard.message }, { status: guard.status })
  }

  const { searchParams } = new URL(req.url)
  const page = Number(searchParams.get('page')) || 1
  const pageSize = Number(searchParams.get('pageSize')) || 20
  const status = searchParams.get('status') as TenantStatus | null
  const search = searchParams.get('search')

  const result = await listTenants({ page, pageSize, status, search })

  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  const guard = await requirePlatformRole('super_admin')

  if (!guard.ok) {
    return NextResponse.json({ message: guard.message }, { status: guard.status })
  }

  try {
    const body = await req.json()
    const { companyName, dominio, subscriptionPlan, maxUsers, region } = body

    if (!companyName || !dominio) {
      return NextResponse.json(
        { message: ['companyName and dominio are required'] },
        { status: 400 }
      )
    }

    const result = await createTenant({
      companyName,
      dominio,
      subscriptionPlan,
      maxUsers: maxUsers ? Number(maxUsers) : undefined,
      region,
      adminUserId: guard.userId,
      adminEmail: String(guard.platformRole)
    })

    if (!result.ok) {
      return NextResponse.json({ message: ['Failed to create tenant'] }, { status: 500 })
    }

    return NextResponse.json({ tenantId: result.tenantId }, { status: 201 })
  } catch (error) {
    console.error('[ADMIN_CREATE_TENANT_ERROR]', error)
    return NextResponse.json({ message: ['Internal server error'] }, { status: 500 })
  }
}
