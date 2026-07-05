import { ForbiddenError } from './errors';
import { getEffectiveViews } from './get-effective-views';
import { describeMask } from './permission-mask';

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
  const views = await getEffectiveViews(identity.tenantId, identity.idUsuario);

  const match = views.find(v => v.viewCode === viewCode);

  // Sin fila resuelta para la vista => el usuario no tiene acceso alguno a ella
  // (fail-closed: o no hay grant, o el techo del depto la dejó en 0, o no está
  // disponible para el tenant). No distinguimos el motivo hacia afuera.
  if (!match) {
    throw new ForbiddenError(
      'Permiso denegado',
      'PERMISSION_DENIED',
      { viewCode, requiredBit, effectiveMask: 0 }
    );
  }

  // Tiene la vista, pero ¿con el bit pedido? (match.mask & bit) === bit
  if ((match.mask & requiredBit) !== requiredBit) {
    throw new ForbiddenError(
      `Permiso insuficiente sobre ${viewCode}: requiere ${describeMask(requiredBit)}, tiene ${describeMask(match.mask)}`,
      'PERMISSION_DENIED',
      { viewCode, requiredBit, effectiveMask: match.mask }
    );
  }

  return { mask: match.mask };
}
