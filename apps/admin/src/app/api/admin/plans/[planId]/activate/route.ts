import { NextRequest, NextResponse } from 'next/server'

import { requirePlatformRole } from '@gaso/shared'
import { activatePlan } from '@/services/plan-service'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const guard = await requirePlatformRole('super_admin')

    if (!guard.ok) {
      return NextResponse.json({ message: guard.message }, { status: guard.status })
    }

    const { planId } = await params

    if (!planId) {
      return NextResponse.json({ message: ['planId is required'] }, { status: 400 })
    }

    const result = await activatePlan(Number(planId))

    if (!result.ok) {
      return NextResponse.json({ message: ['Failed to activate plan'] }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[ACTIVATE_PLAN_ERROR]', error)
    return NextResponse.json({ message: ['Internal server error'] }, { status: 500 })
  }
}
