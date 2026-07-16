import { ForbiddenError } from './errors';
import { getEffectiveViews } from './get-effective-views';
import { describeMask } from './permission-mask';
import type { ErpModuleKey } from '../erp-modules';

/**
 * Capa PURA, sin HTTP: recibe la identidad ya resuelta (no `req`), resuelve el
 * set efectivo del usuario en su tenant y valida que tenga el bit requerido
 * sobre la vista. Si no, LANZA ForbiddenError (el HOF de ruta lo traduce a 403).
 *
 * Testeable en aislamiento. La autorización es server-side y autoritativa:
 *    la copia que el cliente recibe en /api/me es solo para pintar UI.
 *
 * `requiredBit` es explícito (PERM.R/W/U/D).
 * El default verbo->bit vive en el HOF withPermission, como comodidad sobreescribible — aquí no hay magia.
 */

export interface PermissionIdentity {
  tenantId: string;
  idUsuario: number;
}

export interface PermissionGrant {
  /** maskEfectiva del usuario sobre la vista (canónica, != 0). */
  mask: number;
}

export async function requirePermission(
  identity: PermissionIdentity,
  viewCode: string,
  requiredBit: number
): Promise<PermissionGrant> {
  const { views, planMenuGroups } = await getEffectiveViews(identity.tenantId, identity.idUsuario);

  const match = views.find(v => v.viewCode === viewCode);

  // (1) Sin fila resuelta => sin acceso alguno. Motivo: PERMISO.
  if (!match) {
    throw new ForbiddenError(
      'Permiso denegado',
      'PERMISSION_DENIED',
      { viewCode, requiredBit, effectiveMask: 0 }
    );
  }

  // (2) Compuerta de PLAN: la vista existe por RBAC, pero su módulo no está en el
  // plan del tenant => denegado POR PLAN (distinto de por permiso). Caso downgrade.
  if (match.menuGroup && !planMenuGroups.has(match.menuGroup as ErpModuleKey)) {
    throw new ForbiddenError(
      `Módulo fuera del plan del tenant: ${match.menuGroup}`,
      'PLAN_RESTRICTED',
      { viewCode, menuGroup: match.menuGroup }
    );
  }

  // (3) Tiene la vista y el módulo está en plan, ¿pero con el bit pedido?
  if ((match.mask & requiredBit) !== requiredBit) {
    throw new ForbiddenError(
      `Permiso insuficiente sobre ${viewCode}: requiere ${describeMask(requiredBit)}, tiene ${describeMask(match.mask)}`,
      'PERMISSION_DENIED',
      { viewCode, requiredBit, effectiveMask: match.mask }
    );
  }

  return { mask: match.mask };
}
