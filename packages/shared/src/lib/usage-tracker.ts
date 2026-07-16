import { prisma } from './prisma'
import type { UsageMetricKey } from '../types/plan'
import { enforceUserLimit, enforceBranchLimit, enforceStorageLimit } from './plans/plan-limiter'

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

export async function trackUserCreated(tenantId: string): Promise<void> {
  await incrementUsage(tenantId, 'users')
}

export async function trackUserDeleted(tenantId: string): Promise<void> {
  await decrementUsage(tenantId, 'users')
}

export async function trackBranchCreated(tenantId: string): Promise<void> {
  await incrementUsage(tenantId, 'branches')
}

export async function trackBranchDeleted(tenantId: string): Promise<void> {
  await decrementUsage(tenantId, 'branches')
}

export async function trackStorageUsed(tenantId: string, bytes: number): Promise<void> {
  await incrementUsage(tenantId, 'storage_mb', bytesToMb(bytes))
}

export async function trackStorageFreed(tenantId: string, bytes: number): Promise<void> {
  await decrementUsage(tenantId, 'storage_mb', bytesToMb(bytes))
}

export async function setStorageUsage(tenantId: string, bytes: number): Promise<void> {
  await setUsage(tenantId, 'storage_mb', bytesToMb(bytes))
}

export async function enforceAndTrackUserCreation(tenantId: string): Promise<void> {
  await enforceUserLimit(tenantId)
  await trackUserCreated(tenantId)
}

export async function enforceAndTrackBranchCreation(tenantId: string): Promise<void> {
  await enforceBranchLimit(tenantId)
  await trackBranchCreated(tenantId)
}

export async function enforceAndTrackStorageUpload(
  tenantId: string,
  fileBytes: number
): Promise<void> {
  await enforceStorageLimit(tenantId, fileBytes)
  await trackStorageUsed(tenantId, fileBytes)
}

export async function syncUserCount(tenantId: string, actualCount: number): Promise<void> {
  await setUsage(tenantId, 'users', actualCount)
}

export async function syncBranchCount(tenantId: string, actualCount: number): Promise<void> {
  await setUsage(tenantId, 'branches', actualCount)
}

function bytesToMb(bytes: number): number {
  return Math.ceil(bytes / (1024 * 1024))
}
