export type PlanTier = 'basic' | 'professional' | 'enterprise'

export type SupportLevel = 'email' | 'priority' | 'dedicated'

export type TenantSubscriptionStatus = 'TRIAL' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED'

export type BillingRecordStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED'

export type UsageMetricKey = 'users' | 'branches' | 'storage_mb'

export type PlanLimits = {
  maxUsers: number | null
  maxBranches: number | null
  storageMb: number | null
}

export type PlanDefinition = {
  id: number
  name: PlanTier
  displayName: string
  description: string | null
  monthlyPrice: number
  limits: PlanLimits
  supportLevel: SupportLevel
  hasAdvancedReports: boolean
  hasBranding: boolean
  isActive: boolean
  sortOrder: number
}

export type SubmoduleNode = {
  idSubModulo: number
  idModulo: number
  nombreSubModulo: string
}

export type ModuleNode = {
  idModulo: number
  nombreModulo: string
  variable: string
  submodules: SubmoduleNode[]
}

export type PlanFeatureKey =
  | 'dashboard'
  | 'warehouses'
  | 'human_capital'
  | 'projects'
  | 'administration'
  | 'operating_expenses'
  | 'quotes'
  | 'suppliers'
  | 'vehicles'

export type PlanFeatureMap = Record<PlanFeatureKey, boolean>

export type ModuleCatalog = ModuleNode[]

export type PlanFeature = {
  planFeatureId: number
  planId: number
  idModulo: number | null
  idSubModulo: number | null
  nombreModulo?: string | null
  nombreSubModulo?: string | null
}

export type PlanFeaturesById = {
  modules: Record<number, boolean>
  submodules: Record<number, boolean>
}

export type PlanWithFeatures = PlanDefinition & {
  features: PlanFeature[]
  featuresById: PlanFeaturesById
}

export type TenantSubscription = {
  subscriptionId: string
  tenantId: string
  planId: number
  planName: PlanTier | null
  planDisplayName: string | null
  status: TenantSubscriptionStatus
  startedAt: Date
  expiresAt: Date | null
  autoRenew: boolean
  createdAt: Date
  updatedAt: Date
}

export type TenantUsage = {
  metricKey: UsageMetricKey
  currentValue: number
  limit: number | null
  isExceeded: boolean
}

export type BillingRecord = {
  billingRecordId: string
  tenantId: string
  subscriptionId: string | null
  amount: number
  currency: string
  status: BillingRecordStatus
  periodStart: Date | null
  periodEnd: Date | null
  paidAt: Date | null
  notes: string | null
  createdAt: Date
}

export type PlanCheckResult = {
  allowed: boolean
  reason?: PlanLimitReason
  current?: number
  limit?: number | null
  planName?: PlanTier | null
}

export type PlanLimitReason =
  | 'USER_LIMIT_EXCEEDED'
  | 'BRANCH_LIMIT_EXCEEDED'
  | 'STORAGE_LIMIT_EXCEEDED'
  | 'MODULE_DISABLED'
  | 'PLAN_EXPIRED'
  | 'PLAN_SUSPENDED'
  | 'PLAN_NOT_FOUND'
  | 'SUBSCRIPTION_NOT_FOUND'
