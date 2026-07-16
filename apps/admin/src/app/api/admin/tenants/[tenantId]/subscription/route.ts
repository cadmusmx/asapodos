import { NextResponse } from 'next/server'

import {
  getTenantSubscription,
  createSubscription,
  updateSubscription,
  cancelSubscription,
  renewSubscription,
} from '@/services/subscription-service'
import { getTenantById } from '@/services/tenant-service'
import type { TenantSubscriptionStatus } from '@gaso/shared/types/plan'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params
    const subscription = await getTenantSubscription(tenantId)
    return NextResponse.json({ subscription })
  } catch (error) {
    console.error('[GET_SUBSCRIPTION_ERROR]', error)
    return NextResponse.json({ message: 'Error loading subscription' }, { status: 500 })
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params
    const body = await req.json()
    const { planId, expiresAt, adminUserId, adminEmail } = body

    if (!planId || Number(planId) <= 0) {
      return NextResponse.json({ message: 'planId is required' }, { status: 400 })
    }

    if (adminUserId == null || !adminEmail) {
      return NextResponse.json({ message: 'adminUserId and adminEmail are required' }, { status: 400 })
    }

    const result = await createSubscription({
      tenantId,
      planId: Number(planId),
      status: (body.status as TenantSubscriptionStatus) ?? 'ACTIVE',
      expiresAt: expiresAt && expiresAt !== 'null' ? new Date(expiresAt) : null,
      adminUserId: Number(adminUserId),
      adminEmail,
    })

    if (!result.ok) {
      return NextResponse.json({ message: result.error }, { status: 500 })
    }

    return NextResponse.json({ subscriptionId: result.subscriptionId }, { status: 201 })
  } catch (error) {
    console.error('[CREATE_SUBSCRIPTION_ERROR]', error)
    return NextResponse.json({ message: 'Error creating subscription' }, { status: 500 })
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params
    const body = await req.json()
    const { subscriptionId, planId, status, expiresAt, autoRenew, adminUserId, adminEmail } = body

    if (!subscriptionId) {
      return NextResponse.json({ message: 'subscriptionId is required' }, { status: 400 })
    }

    if (adminUserId == null || !adminEmail) {
      return NextResponse.json({ message: 'adminUserId and adminEmail are required' }, { status: 400 })
    }

    const result = await updateSubscription({
      subscriptionId,
      planId: planId !== undefined ? Number(planId) : undefined,
      status: status as TenantSubscriptionStatus | null,
      expiresAt: expiresAt !== undefined ? (expiresAt ? new Date(expiresAt) : null) : undefined,
      autoRenew,
      adminUserId: Number(adminUserId),
      adminEmail,
    })

    if (!result.ok) {
      return NextResponse.json({ message: result.error }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[UPDATE_SUBSCRIPTION_ERROR]', error)
    return NextResponse.json({ message: 'Error updating subscription' }, { status: 500 })
  }
}
