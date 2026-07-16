import { revalidateTag } from 'next/cache'
import { prisma, writeTransactionLog } from '@gaso/shared'
import type { BillingRecord, BillingRecordStatus } from '@gaso/shared/types/plan'

interface BillingRow {
  BillingRecordId: string
  TenantId: string
  SubscriptionId: string | null
  Amount: number
  Currency: string
  Status: string
  PeriodStart: Date | null
  PeriodEnd: Date | null
  PaidAt: Date | null
  Notes: string | null
  CreatedAt: Date
}

interface CreateBillingRecordOptions {
  tenantId: string
  subscriptionId?: string | null
  amount: number
  currency?: string
  status?: BillingRecordStatus
  periodStart?: Date | null
  periodEnd?: Date | null
  notes?: string | null
  adminUserId: number
  adminEmail: string
}

export async function getTenantBillingRecords(
  tenantId: string,
  limit: number = 50
): Promise<BillingRecord[]> {
  const rows = await prisma.$queryRaw<BillingRow[]>`
    SELECT BillingRecordId, TenantId, SubscriptionId, Amount, Currency,
           Status, PeriodStart, PeriodEnd, PaidAt, Notes, CreatedAt
    FROM Security.BillingRecords
    WHERE TenantId = ${tenantId}
    ORDER BY CreatedAt DESC
    OFFSET 0 ROWS FETCH NEXT ${limit} ROWS ONLY
  `

  return rows.map(mapRow)
}

export async function getBillingRecord(
  billingRecordId: string
): Promise<BillingRecord | null> {
  const [row] = await prisma.$queryRaw<BillingRow[]>`
    SELECT BillingRecordId, TenantId, SubscriptionId, Amount, Currency,
           Status, PeriodStart, PeriodEnd, PaidAt, Notes, CreatedAt
    FROM Security.BillingRecords
    WHERE BillingRecordId = ${billingRecordId}
  `

  return row ? mapRow(row) : null
}

export async function createBillingRecord(
  options: CreateBillingRecordOptions
): Promise<{ ok: boolean; billingRecordId?: string; error?: string }> {
  try {
    const [result] = await prisma.$queryRaw<[{ BillingRecordId: string }]>`
      INSERT INTO Security.BillingRecords (
        TenantId, SubscriptionId, Amount, Currency, Status,
        PeriodStart, PeriodEnd, Notes
      )
      OUTPUT INSERTED.BillingRecordId
      VALUES (
        ${options.tenantId},
        ${options.subscriptionId ?? null},
        ${options.amount},
        ${options.currency ?? 'USD'},
        ${options.status ?? 'PENDING'},
        ${options.periodStart ?? null},
        ${options.periodEnd ?? null},
        ${options.notes ?? null}
      )
    `

    await writeTransactionLog({
      tenantId: options.tenantId,
      tableName: 'Security.BillingRecords',
      action: 'BILL_CR',
      userId: options.adminUserId,
      newData: {
        amount: options.amount,
        currency: options.currency ?? 'USD',
        status: options.status ?? 'PENDING',
      },
      appUser: options.adminEmail,
    })

    revalidateTag('billing')
    revalidateTag('tenant')

    return { ok: true, billingRecordId: result.BillingRecordId }
  } catch (error) {
    console.error('[CREATE_BILLING_RECORD_ERROR]', error)
    return { ok: false, error: 'INTERNAL_ERROR' }
  }
}

export async function markBillingRecordPaid(
  billingRecordId: string,
  adminUserId: number,
  adminEmail: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const [record] = await prisma.$queryRaw<[{ TenantId: string }]>`
      SELECT TenantId FROM Security.BillingRecords WHERE BillingRecordId = ${billingRecordId}
    `

    if (!record) {
      return { ok: false, error: 'BILLING_RECORD_NOT_FOUND' }
    }

    await prisma.$executeRaw`
      UPDATE Security.BillingRecords
      SET Status = 'PAID', PaidAt = SYSUTCDATETIME()
      WHERE BillingRecordId = ${billingRecordId}
    `

    await writeTransactionLog({
      tenantId: record.TenantId,
      tableName: 'Security.BillingRecords',
      action: 'BILL_PAID',
      userId: adminUserId,
      newData: { billingRecordId },
      appUser: adminEmail,
    })

    revalidateTag('billing')
    return { ok: true }
  } catch (error) {
    console.error('[MARK_BILLING_PAID_ERROR]', error)
    return { ok: false, error: 'INTERNAL_ERROR' }
  }
}

export async function refundBillingRecord(
  billingRecordId: string,
  adminUserId: number,
  adminEmail: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const [record] = await prisma.$queryRaw<[{ TenantId: string }]>`
      SELECT TenantId FROM Security.BillingRecords WHERE BillingRecordId = ${billingRecordId}
    `

    if (!record) {
      return { ok: false, error: 'BILLING_RECORD_NOT_FOUND' }
    }

    await prisma.$executeRaw`
      UPDATE Security.BillingRecords
      SET Status = 'REFUNDED'
      WHERE BillingRecordId = ${billingRecordId}
    `

    await writeTransactionLog({
      tenantId: record.TenantId,
      tableName: 'Security.BillingRecords',
      action: 'BILL_REFUND',
      userId: adminUserId,
      newData: { billingRecordId },
      appUser: adminEmail,
    })

    revalidateTag('billing')
    return { ok: true }
  } catch (error) {
    console.error('[REFUND_BILLING_ERROR]', error)
    return { ok: false, error: 'INTERNAL_ERROR' }
  }
}

function mapRow(row: BillingRow): BillingRecord {
  return {
    billingRecordId: row.BillingRecordId,
    tenantId: row.TenantId,
    subscriptionId: row.SubscriptionId,
    amount: row.Amount,
    currency: row.Currency,
    status: row.Status as BillingRecordStatus,
    periodStart: row.PeriodStart,
    periodEnd: row.PeriodEnd,
    paidAt: row.PaidAt,
    notes: row.Notes,
    createdAt: row.CreatedAt,
  }
}
