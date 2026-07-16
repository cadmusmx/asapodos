import { revalidateTag } from 'next/cache'
import { prisma, writeTransactionLog } from '@gaso/shared'
import type { TenantSubscription, TenantSubscriptionStatus } from '@gaso/shared/types/plan'

interface SubscriptionRow {
  SubscriptionId: string
  TenantId: string
  PlanId: number
  PlanName: string | null
  PlanDisplayName: string | null
  Status: string
  StartedAt: Date
  ExpiresAt: Date | null
  AutoRenew: number
  CreatedAt: Date
  UpdatedAt: Date
}

interface CreateSubscriptionOptions {
  tenantId: string
  planId: number
  status?: TenantSubscriptionStatus
  expiresAt?: Date | null
  adminUserId: number
  adminEmail: string
}

interface UpdateSubscriptionOptions {
  subscriptionId: string
  planId?: number
  status?: TenantSubscriptionStatus | null
  expiresAt?: Date | null
  autoRenew?: boolean
  adminUserId: number
  adminEmail: string
}

export async function getTenantSubscription(tenantId: string): Promise<TenantSubscription | null> {
  const [row] = await prisma.$queryRaw<SubscriptionRow[]>`
    SELECT
      s.SubscriptionId,
      s.TenantId,
      s.PlanId,
      p.Name AS PlanName,
      p.DisplayName AS PlanDisplayName,
      s.Status,
      s.StartedAt,
      s.ExpiresAt,
      s.AutoRenew,
      s.CreatedAt,
      s.UpdatedAt
    FROM Security.TenantSubscriptions s
    INNER JOIN Security.Plans p ON p.PlanId = s.PlanId
    WHERE s.TenantId = ${tenantId}
    ORDER BY s.CreatedAt DESC
  `

  if (!row) return null

  return mapRow(row)
}

export async function getActiveSubscription(tenantId: string): Promise<TenantSubscription | null> {
  const [row] = await prisma.$queryRaw<SubscriptionRow[]>`
    SELECT
      s.SubscriptionId,
      s.TenantId,
      s.PlanId,
      p.Name AS PlanName,
      p.DisplayName AS PlanDisplayName,
      s.Status,
      s.StartedAt,
      s.ExpiresAt,
      s.AutoRenew,
      s.CreatedAt,
      s.UpdatedAt
    FROM Security.TenantSubscriptions s
    INNER JOIN Security.Plans p ON p.PlanId = s.PlanId
    WHERE s.TenantId = ${tenantId}
      AND s.Status IN ('TRIAL', 'ACTIVE')
    ORDER BY s.CreatedAt DESC
  `

  if (!row) return null

  return mapRow(row)
}

export async function createSubscription(
  options: CreateSubscriptionOptions
): Promise<{ ok: boolean; subscriptionId?: string; error?: string }> {
  try {
    const expiresAtVal = options.expiresAt instanceof Date
      ? options.expiresAt.toISOString()
      : null

    const params: (string | number | null)[] = [options.tenantId, options.planId, options.status ?? 'TRIAL']
    let sql = `EXEC Security.usp_CreateTenantSubscription @TenantId=@p1, @PlanId=@p2, @Status=@p3`

    if (expiresAtVal !== null) {
      sql += `, @ExpiresAt=@p4`
      params.push(expiresAtVal)
    }

    sql += `, @AutoRenew=@p${params.length + 1}`
    params.push(1)

    const [result] = await prisma.$queryRawUnsafe<[{ SubscriptionId: string }]>(sql, ...params)

    await writeTransactionLog({
      tenantId: options.tenantId,
      tableName: 'Security.TenantSubscriptions',
      action: 'SUB_CR',
      userId: options.adminUserId,
      newData: { planId: options.planId, status: options.status ?? 'TRIAL' },
      appUser: options.adminEmail,
    })

    revalidateTag('subscriptions')
    revalidateTag('tenant')

    return { ok: true, subscriptionId: result.SubscriptionId }
  } catch (error) {
    console.error('[CREATE_SUBSCRIPTION_ERROR]', error)
    return { ok: false, error: 'INTERNAL_ERROR' }
  }
}

export async function updateSubscription(
  options: UpdateSubscriptionOptions
): Promise<{ ok: boolean; error?: string }> {
  try {
    const existing = await prisma.$queryRaw<[{ SubscriptionId: string }]>`
      SELECT SubscriptionId FROM Security.TenantSubscriptions
      WHERE SubscriptionId = ${options.subscriptionId}
    `

    if (!existing[0]) {
      return { ok: false, error: 'SUBSCRIPTION_NOT_FOUND' }
    }

    const updates: string[] = []
    const params: (string | number | null)[] = []
    let i = 1

    if (options.planId !== undefined) {
      params.push(options.planId)
      updates.push(`PlanId = @p${i++}`)
    }
    if (options.status !== undefined) {
      params.push(options.status)
      updates.push(`Status = @p${i++}`)
    }
    if (options.expiresAt !== undefined) {
      params.push(options.expiresAt instanceof Date ? options.expiresAt.toISOString() : options.expiresAt)
      updates.push(`ExpiresAt = @p${i++}`)
    }
    if (options.autoRenew !== undefined) {
      params.push(options.autoRenew ? 1 : 0)
      updates.push(`AutoRenew = @p${i++}`)
    }

    if (updates.length === 0) {
      return { ok: true }
    }

    params.push(options.subscriptionId)
    updates.push(`UpdatedAt = SYSUTCDATETIME()`)

    await prisma.$executeRawUnsafe(
      `UPDATE Security.TenantSubscriptions SET ${updates.join(', ')} WHERE SubscriptionId = @p${i}`,
      ...params
    )

    await writeTransactionLog({
      tenantId: '',
      tableName: 'Security.TenantSubscriptions',
      action: 'SUB_UP',
      userId: options.adminUserId,
      newData: { ...options },
      appUser: options.adminEmail,
    })

    revalidateTag('subscriptions')
    revalidateTag('tenant')

    return { ok: true }
  } catch (error) {
    console.error('[UPDATE_SUBSCRIPTION_ERROR]', error)
    return { ok: false, error: 'INTERNAL_ERROR' }
  }
}

export async function cancelSubscription(
  subscriptionId: string,
  adminUserId: number,
  adminEmail: string
): Promise<{ ok: boolean; error?: string }> {
  return updateSubscription({
    subscriptionId,
    status: 'CANCELLED',
    adminUserId,
    adminEmail,
  })
}

export async function renewSubscription(
  subscriptionId: string,
  expiresAt: Date,
  adminUserId: number,
  adminEmail: string
): Promise<{ ok: boolean; error?: string }> {
  return updateSubscription({
    subscriptionId,
    status: 'ACTIVE',
    expiresAt,
    adminUserId,
    adminEmail,
  })
}

function mapRow(row: SubscriptionRow): TenantSubscription {
  return {
    subscriptionId: row.SubscriptionId,
    tenantId: row.TenantId,
    planId: row.PlanId,
    planName: row.PlanName as TenantSubscription['planName'],
    planDisplayName: row.PlanDisplayName,
    status: row.Status as TenantSubscriptionStatus,
    startedAt: row.StartedAt,
    expiresAt: row.ExpiresAt,
    autoRenew: Boolean(row.AutoRenew),
    createdAt: row.CreatedAt,
    updatedAt: row.UpdatedAt,
  }
}
