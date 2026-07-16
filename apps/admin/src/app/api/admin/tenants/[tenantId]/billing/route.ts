import { NextResponse } from 'next/server'

import { getTenantBillingRecords, createBillingRecord, markBillingRecordPaid, refundBillingRecord } from '@/services/billing-service'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params
    const { searchParams } = new URL(req.url)
    const limit = Number(searchParams.get('limit') ?? '50')

    const records = await getTenantBillingRecords(tenantId, limit)
    return NextResponse.json({ billingRecords: records })
  } catch (error) {
    console.error('[GET_BILLING_RECORDS_ERROR]', error)
    return NextResponse.json({ message: 'Error loading billing records' }, { status: 500 })
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params
    const body = await req.json()
    const { subscriptionId, amount, currency, status, periodStart, periodEnd, notes, adminUserId, adminEmail } = body

    if (amount === undefined) {
      return NextResponse.json({ message: 'amount is required' }, { status: 400 })
    }

    if (!adminUserId || !adminEmail) {
      return NextResponse.json({ message: 'adminUserId and adminEmail are required' }, { status: 400 })
    }

    const result = await createBillingRecord({
      tenantId,
      subscriptionId: subscriptionId ?? null,
      amount: Number(amount),
      currency: currency ?? 'USD',
      status: status ?? 'PENDING',
      periodStart: periodStart ? new Date(periodStart) : null,
      periodEnd: periodEnd ? new Date(periodEnd) : null,
      notes,
      adminUserId: Number(adminUserId),
      adminEmail,
    })

    if (!result.ok) {
      return NextResponse.json({ message: result.error }, { status: 500 })
    }

    return NextResponse.json({ billingRecordId: result.billingRecordId }, { status: 201 })
  } catch (error) {
    console.error('[CREATE_BILLING_RECORD_ERROR]', error)
    return NextResponse.json({ message: 'Error creating billing record' }, { status: 500 })
  }
}
