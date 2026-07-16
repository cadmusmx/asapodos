import { NextResponse } from 'next/server'

import { getTenantUsageWithPlanLimit } from '@/services/usage-service'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params
    const usage = await getTenantUsageWithPlanLimit(tenantId)
    return NextResponse.json({ usage })
  } catch (error) {
    console.error('[GET_USAGE_ERROR]', error)
    return NextResponse.json({ message: 'Error loading usage' }, { status: 500 })
  }
}
