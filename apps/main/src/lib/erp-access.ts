import type { TenantModuleSettings } from '@/types/tenant-settings'

import { type ErpModuleKey } from './erp-modules'

export type ErpAccessUser = {
  id?: number | string | null
  admin?: boolean | null
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

type GetModuleAccessParams = {
  moduleKey: ErpModuleKey
  user?: ErpAccessUser | null
  tenantModules?: TenantModuleSettings
}

/**
 * ¿El tenant tiene esta área activada? (config de tenant, independiente del RBAC)
 * Explícito `false` => apagado. Ausente/undefined => encendido (el RBAC sigue gateando).
 */
export const isTenantModuleEnabled = (
  moduleKey: ErpModuleKey,
  tenantModules?: TenantModuleSettings
): boolean => {
  return tenantModules?.[moduleKey] !== false
}

export const canAccessErpModule = ({
  moduleKey,
  user,
  tenantModules
}: GetModuleAccessParams): ErpAccessResult => {
  if (!user) {
    return { allowed: false, reason: 'NO_SESSION' }
  }

  if (!isTenantModuleEnabled(moduleKey, tenantModules)) {
    return { allowed: false, reason: 'MODULE_DISABLED' }
  }

  const publicAuthenticatedModules: ErpModuleKey[] = ['dashboard', 'warehouses', 'human_capital', 'projects']

  if (publicAuthenticatedModules.includes(moduleKey)) {
    return { allowed: true }
  }

  if (moduleKey === 'administration') {
    return {
      allowed: user.admin === true,
      reason: user.admin === true ? undefined : 'MODULE_RESTRICTED'
    }
  }

  return { allowed: false, reason: 'MODULE_RESTRICTED' }
}

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

// ===========================================================================
// RBAC (S2): visibilidad de módulos del shell
// Tras homologar el vocabulario, ErpModuleKey === MenuGroup (1:1), así que el
// "puente" es identidad: basta consultar menuGroups[moduleKey]. El servidor
// expone `menuGroups` crudos (de /api/me); cada consumidor (shell, Flutter) los lee.
// ===========================================================================

/** ¿El usuario tiene ≥1 vista RBAC del MenuGroup homónimo a este módulo? */
export const hasRbacModuleAccess = (
  moduleKey: ErpModuleKey,
  menuGroups?: Record<string, boolean>
): boolean => menuGroups?.[moduleKey] === true

type GetNavigationAccessParams = {
  moduleKey: ErpModuleKey
  isLoading: boolean
  isAdmin: boolean
  menuGroups?: Record<string, boolean>
  tenantModules?: TenantModuleSettings
}

export const canViewErpNavigationModule = ({
  moduleKey,
  isLoading,
  isAdmin,
  menuGroups,
  tenantModules
}: GetNavigationAccessParams): boolean => {
  if (isLoading) return false

  // 1) El tenant debe tener el área activada (config de tenant).
  if (!isTenantModuleEnabled(moduleKey, tenantModules)) return false

  // 2) RBAC manda. administration: RBAC primero, admin como RED DE SEGURIDAD.
  const rbacAllows = hasRbacModuleAccess(moduleKey, menuGroups)

  if (moduleKey === 'administration') return rbacAllows || isAdmin

  return rbacAllows
}
