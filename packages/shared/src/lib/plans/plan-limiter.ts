import { getTenantUsage, getEffectivePlan } from './plan-resolver'
import type { PlanCheckResult, PlanFeatureKey, UsageMetricKey } from '../../types/plan'
import { PlanLimitError } from './errors'

export function isLimitExceeded(current: number, limit: number | null): boolean {
  if (limit === null) return false
  return current >= limit
}

export async function checkUserLimit(tenantId: string): Promise<PlanCheckResult> {
  const plan = await getEffectivePlan(tenantId)
  if (!plan) {
    return { allowed: false, reason: 'PLAN_NOT_FOUND' }
  }

  const limit = plan.limits.maxUsers
  if (limit === null) {
    return { allowed: true, planName: plan.name }
  }

  const current = await getTenantUsage(tenantId, 'users')
  const exceeded = isLimitExceeded(current, limit)

  return {
    allowed: !exceeded,
    reason: exceeded ? 'USER_LIMIT_EXCEEDED' : undefined,
    current,
    limit,
    planName: plan.name,
  }
}

export async function checkBranchLimit(tenantId: string): Promise<PlanCheckResult> {
  const plan = await getEffectivePlan(tenantId)
  if (!plan) {
    return { allowed: false, reason: 'PLAN_NOT_FOUND' }
  }

  const limit = plan.limits.maxBranches
  if (limit === null) {
    return { allowed: true, planName: plan.name }
  }

  const current = await getTenantUsage(tenantId, 'branches')
  const exceeded = isLimitExceeded(current, limit)

  return {
    allowed: !exceeded,
    reason: exceeded ? 'BRANCH_LIMIT_EXCEEDED' : undefined,
    current,
    limit,
    planName: plan.name,
  }
}

export async function checkStorageLimit(
  tenantId: string,
  additionalBytes: number = 0
): Promise<PlanCheckResult> {
  const plan = await getEffectivePlan(tenantId)
  if (!plan) {
    return { allowed: false, reason: 'PLAN_NOT_FOUND' }
  }

  const limitMb = plan.limits.storageMb
  if (limitMb === null) {
    return { allowed: true, planName: plan.name }
  }

  const limitBytes = limitMb * 1024 * 1024
  const currentBytes = await getTenantUsage(tenantId, 'storage_mb')
  const totalWouldBe = currentBytes + additionalBytes

  return {
    allowed: totalWouldBe <= limitBytes,
    reason: totalWouldBe > limitBytes ? 'STORAGE_LIMIT_EXCEEDED' : undefined,
    current: Math.round(currentBytes / (1024 * 1024)),
    limit: limitMb,
    planName: plan.name,
  }
}

export async function checkModuleAccess(
  tenantId: string,
  moduleKey: PlanFeatureKey
): Promise<{ allowed: boolean; reason?: PlanCheckResult['reason'] }> {
  const plan = await getEffectivePlan(tenantId)
  if (!plan) {
    return { allowed: false, reason: 'PLAN_NOT_FOUND' }
  }

  const enabledModuleCount = Object.keys(plan.featuresById.modules).filter(
    id => plan.featuresById.modules[Number(id)] === true
  ).length

  const allowed = enabledModuleCount > 0

  return {
    allowed,
    reason: allowed ? undefined : 'MODULE_DISABLED',
  }
}

export async function enforceUserLimit(tenantId: string): Promise<void> {
  const result = await checkUserLimit(tenantId)
  if (!result.allowed) {
    throw new PlanLimitError(
      'Límite de usuarios alcanzado para este plan',
      result.reason!,
      {
        metric: 'users',
        current: result.current,
        limit: result.limit,
      }
    )
  }
}

export async function enforceBranchLimit(tenantId: string): Promise<void> {
  const result = await checkBranchLimit(tenantId)
  if (!result.allowed) {
    throw new PlanLimitError(
      'Límite de sucursales alcanzado para este plan',
      result.reason!,
      {
        metric: 'branches',
        current: result.current,
        limit: result.limit,
      }
    )
  }
}

export async function enforceStorageLimit(
  tenantId: string,
  additionalBytes: number = 0
): Promise<void> {
  const result = await checkStorageLimit(tenantId, additionalBytes)
  if (!result.allowed) {
    throw new PlanLimitError(
      'Límite de almacenamiento alcanzado para este plan',
      result.reason!,
      {
        metric: 'storage_mb',
        current: result.current,
        limit: result.limit,
      }
    )
  }
}

export async function enforceModuleAccess(
  tenantId: string,
  moduleKey: PlanFeatureKey
): Promise<void> {
  const result = await checkModuleAccess(tenantId, moduleKey)
  if (!result.allowed) {
    throw new PlanLimitError(
      `El módulo '${moduleKey}' no está disponible en tu plan actual`,
      result.reason!,
      { module: moduleKey }
    )
  }
}
