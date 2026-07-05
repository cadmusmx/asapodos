import { withTenantContext } from '../tenant-context'

import { resolveUserViews, type ResolvedView } from './resolve-permissions'

/**
 * Punto ÚNICO que abre el contexto de tenant para resolver permisos.
 * Lo reusan los guards de permiso (requirePermission, vía withPermission en APIs
 * y requireViewAccess en páginas) y /api/me, para no repetir el withTenantContext
 * ni anidar transacciones por accidente.
 * para no repetir el withTenantContext + no anidar transacciones por accidente.
 *
 * Invariante: `tenantId` es el del request ya validado (header / JWT).
 * El SESSION_CONTEXT se fija aquí sobre la conexión transaccional;
 * resolveUserViews corre sobre ese mismo `tx`.
 */
export function getEffectiveViews(
  tenantId: string,
  idUsuario: number
): Promise<ResolvedView[]> {
  return withTenantContext(tenantId, tx => resolveUserViews(tx, { tenantId, idUsuario }));
}
