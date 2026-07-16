import { withTenantContext } from '../tenant-context';
import { getEnabledMenuGroups } from '../plans/plan-menu-groups';
import { resolveUserViews, type ResolvedView } from './resolve-permissions';
import { ErpModuleKey } from '../erp-modules';

export interface EffectiveViews {
  views: ResolvedView[];
  planMenuGroups: Set<ErpModuleKey>;
}

/**
 * Punto ÚNICO que abre el contexto de tenant para resolver permisos.
 * Devuelve las vistas RBAC (puras) + los MenuGroups del PLAN,
 * para que requirePermission combine RBAC ∧ plan y distinga "por plan" de "por permiso".
 */
export function getEffectiveViews(
  tenantId: string,
  idUsuario: number
): Promise<EffectiveViews> {
  return withTenantContext(tenantId, async tx => {
    const [views, planMenuGroups] = await Promise.all([
      resolveUserViews(tx, { tenantId, idUsuario }),
      getEnabledMenuGroups(tx, tenantId),
    ]);

    return { views, planMenuGroups };
  });
}
