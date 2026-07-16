import { prisma } from '../prisma'
import { getPlanDefinition, isValidPlanName } from './plan-registry'
import type {
  PlanDefinition,
  PlanWithFeatures,
  PlanTier,
  TenantSubscription,
  TenantUsage,
  UsageMetricKey,
  PlanFeaturesById,
  PlanFeature,
} from '../../types/plan'
import { SubscriptionNotFoundError } from './errors'

interface PlanRow {
  PlanId: number
  Name: string
  DisplayName: string | null
  Description: string | null
  MonthlyPrice: number
  MaxUsers: number | null
  MaxBranches: number | null
  StorageMb: number | null
  SupportLevel: string
  HasAdvancedReports: number
  HasBranding: number
  IsActive: number
  SortOrder: number
}

interface PlanFeatureRow {
  PlanId: number
  IdModulo: number | null
  IdSubModulo: number | null
}

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

interface UsageRow {
  TenantId: string
  MetricKey: string
  CurrentValue: number
}

export async function getTenantActiveSubscription(
  tenantId: string
): Promise<TenantSubscription | null> {
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

  return {
    subscriptionId: row.SubscriptionId,
    tenantId: row.TenantId,
    planId: row.PlanId,
    planName: row.PlanName as PlanTier | null,
    planDisplayName: row.PlanDisplayName,
    status: row.Status as TenantSubscription['status'],
    startedAt: row.StartedAt,
    expiresAt: row.ExpiresAt,
    autoRenew: Boolean(row.AutoRenew),
    createdAt: row.CreatedAt,
    updatedAt: row.UpdatedAt,
  }
}

export async function getPlanById(planId: number): Promise<PlanDefinition | null> {
  const [row] = await prisma.$queryRaw<PlanRow[]>`
    SELECT PlanId, Name, DisplayName, Description, MonthlyPrice,
           MaxUsers, MaxBranches, StorageMb, SupportLevel,
           HasAdvancedReports, HasBranding, IsActive, SortOrder
    FROM Security.Plans
    WHERE PlanId = ${planId} AND IsActive = 1
  `

  if (!row) return null

  return mapPlanRow(row)
}

export async function getPlanFeaturesById(planId: number): Promise<PlanFeaturesById> {
  const rows = await prisma.$queryRaw<PlanFeatureRow[]>`
    SELECT PlanId, IdModulo, IdSubModulo
    FROM Security.PlanFeatures
    WHERE PlanId = ${planId}
  `

  const modules: Record<number, boolean> = {}
  const submodules: Record<number, boolean> = {}

  for (const row of rows) {
    if (row.IdSubModulo != null) {
      submodules[row.IdSubModulo] = true
    }
    if (row.IdModulo != null) {
      modules[row.IdModulo] = true
    }
  }

  return { modules, submodules }
}

export async function getPlanFeatureList(planId: number): Promise<PlanFeature[]> {
  const rows = await prisma.$queryRaw<PlanFeatureRow[]>`
    SELECT PlanId, IdModulo, IdSubModulo
    FROM Security.PlanFeatures
    WHERE PlanId = ${planId}
  `

  return rows.map((row, idx) => ({
    planFeatureId: idx,
    planId: row.PlanId,
    idModulo: row.IdModulo,
    idSubModulo: row.IdSubModulo,
  }))
}

export async function getPlanWithFeatures(planId: number): Promise<PlanWithFeatures | null> {
  const plan = await getPlanById(planId)
  if (!plan) return null

  const features = await getPlanFeatureList(planId)
  const featuresById = await getPlanFeaturesById(planId)

  return {
    ...plan,
    features,
    featuresById,
  }
}

export async function getAllActivePlans(): Promise<PlanDefinition[]> {
  const rows = await prisma.$queryRaw<PlanRow[]>`
    SELECT PlanId, Name, DisplayName, Description, MonthlyPrice,
           MaxUsers, MaxBranches, StorageMb, SupportLevel,
           HasAdvancedReports, HasBranding, IsActive, SortOrder
    FROM Security.Plans
    WHERE IsActive = 1
    ORDER BY SortOrder ASC
  `

  return rows.map(mapPlanRow)
}

export async function getTenantUsage(
  tenantId: string,
  metricKey: UsageMetricKey
): Promise<number> {
  const [row] = await prisma.$queryRaw<UsageRow[]>`
    SELECT TenantId, MetricKey, CurrentValue
    FROM Security.TenantUsage
    WHERE TenantId = ${tenantId} AND MetricKey = ${metricKey}
  `

  return row?.CurrentValue ?? 0
}

export async function getAllTenantUsage(
  tenantId: string
): Promise<TenantUsage[]> {
  const rows = await prisma.$queryRaw<UsageRow[]>`
    SELECT TenantId, MetricKey, CurrentValue
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

export async function getEffectivePlan(tenantId: string): Promise<PlanWithFeatures | null> {
  const subscription = await getTenantActiveSubscription(tenantId)
  if (!subscription) return null

  return getPlanWithFeatures(subscription.planId)
}

function mapPlanRow(row: PlanRow): PlanDefinition {
  return {
    id: row.PlanId,
    name: row.Name as PlanTier,
    displayName: row.DisplayName ?? row.Name,
    description: row.Description,
    monthlyPrice: row.MonthlyPrice,
    limits: {
      maxUsers: row.MaxUsers,
      maxBranches: row.MaxBranches,
      storageMb: row.StorageMb,
    },
    supportLevel: row.SupportLevel as PlanDefinition['supportLevel'],
    hasAdvancedReports: Boolean(row.HasAdvancedReports),
    hasBranding: Boolean(row.HasBranding),
    isActive: Boolean(row.IsActive),
    sortOrder: row.SortOrder,
  }
}
