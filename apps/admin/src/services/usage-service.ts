import { prisma } from '@gaso/shared'
import type { TenantUsage, UsageMetricKey } from '@gaso/shared/types/plan'

interface UsageRow {
  TenantId: string
  MetricKey: string
  CurrentValue: number
  UpdatedAt: Date
}

interface UsageWithLimit extends TenantUsage {
  limit: number | null
}

export async function getTenantUsage(tenantId: string): Promise<TenantUsage[]> {
  const rows = await prisma.$queryRaw<UsageRow[]>`
    SELECT TenantId, MetricKey, CurrentValue, UpdatedAt
    FROM Security.TenantUsage
    WHERE TenantId = ${tenantId}
  `

  return rows.map(row => ({
    metricKey: row.MetricKey as UsageMetricKey,
    currentValue: row.CurrentValue,
    limit: null,
    isExceeded: false,
  }))
}

export async function getTenantUsageWithPlanLimit(
  tenantId: string
): Promise<UsageWithLimit[]> {
  const rows = await prisma.$queryRaw<UsageRow[]>`
    SELECT u.TenantId, u.MetricKey, u.CurrentValue, u.UpdatedAt
    FROM Security.TenantUsage u
    WHERE u.TenantId = ${tenantId}
  `

  const sub = await prisma.$queryRaw<[{ MaxUsers: number | null; MaxBranches: number | null; StorageMb: number | null }]>`
    SELECT p.MaxUsers, p.MaxBranches, p.StorageMb
    FROM Security.TenantSubscriptions s
    INNER JOIN Security.Plans p ON p.PlanId = s.PlanId
    WHERE s.TenantId = ${tenantId}
      AND s.Status IN ('TRIAL', 'ACTIVE')
  `

  const limits = sub[0] ?? { MaxUsers: null, MaxBranches: null, StorageMb: null }

  const limitMap: Record<string, number | null> = {
    users: limits.MaxUsers,
    branches: limits.MaxBranches,
    storage_mb: limits.StorageMb,
  }

  return rows.map(row => {
    const limit = limitMap[row.MetricKey] ?? null
    const isExceeded = limit !== null && row.CurrentValue >= limit
    return {
      metricKey: row.MetricKey as UsageMetricKey,
      currentValue: row.CurrentValue,
      limit,
      isExceeded,
      updatedAt: row.UpdatedAt,
    }
  })
}

export async function setUsage(
  tenantId: string,
  metricKey: UsageMetricKey,
  value: number
): Promise<void> {
  await prisma.$executeRaw`
    MERGE Security.TenantUsage AS target
    USING (SELECT ${tenantId} AS TenantId, ${metricKey} AS MetricKey) AS source
    ON target.TenantId = source.TenantId AND target.MetricKey = source.MetricKey
    WHEN MATCHED THEN UPDATE SET CurrentValue = ${value}, UpdatedAt = SYSUTCDATETIME()
    WHEN NOT MATCHED THEN INSERT (TenantId, MetricKey, CurrentValue) VALUES (${tenantId}, ${metricKey}, ${value});
  `
}

export async function incrementUsage(
  tenantId: string,
  metricKey: UsageMetricKey,
  delta: number = 1
): Promise<void> {
  await prisma.$executeRaw`
    MERGE Security.TenantUsage AS target
    USING (SELECT ${tenantId} AS TenantId, ${metricKey} AS MetricKey) AS source
    ON target.TenantId = source.TenantId AND target.MetricKey = source.MetricKey
    WHEN MATCHED THEN UPDATE SET CurrentValue = target.CurrentValue + ${delta}, UpdatedAt = SYSUTCDATETIME()
    WHEN NOT MATCHED THEN INSERT (TenantId, MetricKey, CurrentValue) VALUES (${tenantId}, ${metricKey}, ${delta});
  `
}

export async function decrementUsage(
  tenantId: string,
  metricKey: UsageMetricKey,
  delta: number = 1
): Promise<void> {
  await prisma.$executeRaw`
    MERGE Security.TenantUsage AS target
    USING (SELECT ${tenantId} AS TenantId, ${metricKey} AS MetricKey) AS source
    ON target.TenantId = source.TenantId AND target.MetricKey = source.MetricKey
    WHEN MATCHED THEN UPDATE SET CurrentValue = CASE WHEN target.CurrentValue - ${delta} < 0 THEN 0 ELSE target.CurrentValue - ${delta} END, UpdatedAt = SYSUTCDATETIME()
    WHEN NOT MATCHED THEN INSERT (TenantId, MetricKey, CurrentValue) VALUES (${tenantId}, ${metricKey}, 0);
  `
}
