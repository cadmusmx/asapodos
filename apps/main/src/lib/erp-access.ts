import type { ErpModuleKey } from "@gaso/shared"

export type ErpAccessUser = {
  id?: number | string | null
  profile?: number | null
  company?: number | null
  area?: number | null
  tenantId?: string | null
  tenantSlug?: string | null
  tenantName?: string | null
}

export type ErpAccessResult = {
  allowed: boolean
  reason?: 'NO_SESSION' | 'CROSS_TENANT' | 'MODULE_RESTRICTED' | 'MODULE_DISABLED'
}

type GetNavigationAccessParams = {
  moduleKey: ErpModuleKey;
  isLoading: boolean;
  menuGroups?: Record<string, boolean>;
  planMenuGroups?: ErpModuleKey[]; // antes: planFeatures?: PlanFeaturesById
}

/**
 * ¿El módulo está en el plan del tenant? Per-módulo (corrige el bug de "¿algún módulo?").
 * planMenuGroups viene de /api/me ya traducido y con el fallback aplicado en server;
 * el `!planMenuGroups` es solo seguridad de transición (mientras /api/me propaga).
 */
export const isModuleEnabledByPlan = (
  moduleKey: ErpModuleKey,
  planMenuGroups?: ErpModuleKey[],
): boolean => {
  if (!planMenuGroups) return false;

  return planMenuGroups.includes(moduleKey);
};

export const validateTenantMatch = (
  userTenantId?: string | null,
  resolvedTenantId?: string | null
): ErpAccessResult => {
  if (!userTenantId || !resolvedTenantId) {
    return { allowed: true }
  }

  if (userTenantId !== resolvedTenantId) {
    return { allowed: false, reason: 'CROSS_TENANT' }
  }

  return { allowed: true }
}

export const hasRbacModuleAccess = (
  moduleKey: ErpModuleKey,
  menuGroups?: Record<string, boolean>
): boolean => menuGroups?.[moduleKey] === true

export const canViewErpNavigationModule = ({
  moduleKey,
  isLoading,
  menuGroups,
  planMenuGroups,
}: GetNavigationAccessParams): boolean => {
  if (isLoading) return false;

  const planEnabled = isModuleEnabledByPlan(moduleKey, planMenuGroups);
  const rbacAllows = hasRbacModuleAccess(moduleKey, menuGroups);

  return planEnabled && rbacAllows;
};
