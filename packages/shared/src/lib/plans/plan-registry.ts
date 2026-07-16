import type { PlanDefinition, PlanTier, PlanFeatureMap, PlanFeatureKey, SupportLevel } from '../../types/plan'

const PLANS: Record<PlanTier, Omit<PlanDefinition, 'id'>> = {
  basic: {
    name: 'basic',
    displayName: 'Basic',
    description: 'Para pequeños equipos que inician.',
    monthlyPrice: 29,
    limits: {
      maxUsers: 5,
      maxBranches: 2,
      storageMb: 1024,
    },
    supportLevel: 'email',
    hasAdvancedReports: false,
    hasBranding: false,
    isActive: true,
    sortOrder: 1,
  },
  professional: {
    name: 'professional',
    displayName: 'Professional',
    description: 'Para empresas en crecimiento.',
    monthlyPrice: 99,
    limits: {
      maxUsers: 20,
      maxBranches: 10,
      storageMb: 10240,
    },
    supportLevel: 'priority',
    hasAdvancedReports: true,
    hasBranding: true,
    isActive: true,
    sortOrder: 2,
  },
  enterprise: {
    name: 'enterprise',
    displayName: 'Enterprise',
    description: 'Solucion completa sin límites.',
    monthlyPrice: 299,
    limits: {
      maxUsers: null,
      maxBranches: null,
      storageMb: 102400,
    },
    supportLevel: 'dedicated',
    hasAdvancedReports: true,
    hasBranding: true,
    isActive: true,
    sortOrder: 3,
  },
}

const PLAN_FEATURES: Record<PlanTier, PlanFeatureMap> = {
  basic: {
    dashboard: true,
    warehouses: true,
    human_capital: true,
    projects: false,
    administration: false,
    operating_expenses: false,
    quotes: false,
    suppliers: false,
    vehicles: false,
  },
  professional: {
    dashboard: true,
    warehouses: true,
    human_capital: true,
    projects: true,
    administration: true,
    operating_expenses: true,
    quotes: true,
    suppliers: true,
    vehicles: true,
  },
  enterprise: {
    dashboard: true,
    warehouses: true,
    human_capital: true,
    projects: true,
    administration: true,
    operating_expenses: true,
    quotes: true,
    suppliers: true,
    vehicles: true,
  },
}

export function getPlanDefinition(planName: PlanTier): PlanDefinition {
  return { id: 0, ...PLANS[planName] }
}

export function getPlanFeatures(planName: PlanTier): PlanFeatureMap {
  return { ...PLAN_FEATURES[planName] }
}

export function getAllPlanNames(): PlanTier[] {
  return ['basic', 'professional', 'enterprise']
}

export function isValidPlanName(name: string): name is PlanTier {
  return name in PLANS
}

export function getPlanFeatureValue(
  planName: PlanTier,
  featureKey: PlanFeatureKey
): boolean {
  return PLAN_FEATURES[planName][featureKey] ?? false
}

export function isModuleIncludedInPlan(
  planName: PlanTier,
  moduleKey: PlanFeatureKey
): boolean {
  return PLAN_FEATURES[planName][moduleKey] ?? false
}

export function getPlanSupportLevel(planName: PlanTier): SupportLevel {
  return PLANS[planName].supportLevel
}
