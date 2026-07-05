import { NextResponse } from 'next/server';

import { ForbiddenError, UnauthorizedError, ValidationError } from './errors'
import { PERM } from './permission-mask';
import { requirePermission } from './require-permission';
import { AuthContext, resolveSession } from '../auth/resolve-session';
import { getTenantFromHeaders } from '../tenant-context';

/**
 * Blinda un handler de App Router. Resuelve sesión (cookie web / Bearer móvil)
 * y tenant (header, inyectado por el middleware en ambos transportes), valida
 * coincidencia, exige el permiso y traduce los errores del core a 401/403.
 *
 * El handler envuelto recibe un contexto RBAC ya resuelto { auth, tenantId, mask }
 * para no repetir resolveSession/getTenantFromHeaders, más el ctx de ruta de
 * Next ({ params }) intacto.
 *
 * Default verbo->bit (comodidad sobreescribible con `options.bit`, NO regla):
 *   GET/HEAD -> R   POST -> W   PUT/PATCH -> U   DELETE -> D
 */

export interface RbacContext {
  auth: AuthContext;
  tenantId: string;
  /** maskEfectiva del usuario sobre la vista exigida. */
  mask: number;
}

type GuardedHandler<C> = (
  req: Request,
  rbac: RbacContext,
  routeCtx: C
) => Promise<Response> | Response;

function defaultBitForMethod(method: string): number {
  switch (method.toUpperCase()) {
    case 'GET':
    case 'HEAD':
      return PERM.R;
    case 'POST':
      return PERM.W;
    case 'PUT':
    case 'PATCH':
      return PERM.U;
    case 'DELETE':
      return PERM.D;
    default:
      return PERM.R;
  }
}

export function withPermission<C = unknown>(
  viewCode: string,
  handler: GuardedHandler<C>,
  options?: { bit?: number }
) {
  return async (req: Request, routeCtx: C): Promise<Response> => {
    try {
      const auth = await resolveSession(req);

      if (!auth) {
        throw new UnauthorizedError('No autenticado', 'UNAUTHENTICATED');
      }

      let tenantId: string;

      try {
        tenantId = getTenantFromHeaders(req.headers).id;
      } catch {
        throw new UnauthorizedError('Contexto de tenant no disponible', 'MISSING_TENANT');
      }

      // Coincidencia: si la sesión trae tenant, debe igualar al del header.
      // En móvil, auth.tenantId (Bearer) y el header (slug resuelto por el
      // middleware) son fuentes independientes -> defensa contra slug suplantado.
      if (auth.tenantId && auth.tenantId.toLowerCase() !== tenantId.toLowerCase()) {
        throw new ForbiddenError('Sesión de tenant no válida', 'TENANT_MISMATCH', { viewCode });
      }

      const bit = options?.bit ?? defaultBitForMethod(req.method);

      const { mask } = await requirePermission({ tenantId, idUsuario: auth.userId }, viewCode, bit);

      return await handler(req, { auth, tenantId, mask }, routeCtx);
    } catch (e) {
      if (e instanceof ValidationError) {
        // mensaje seguro y útil: ayuda al cliente a corregir el request
        return NextResponse.json({ message: e.message }, { status: 400 })
      }

      if (e instanceof UnauthorizedError) {
        return NextResponse.json({ message: e.message }, { status: 401 })
      }

      if (e instanceof ForbiddenError) {
        // details solo a log server-side; el cliente recibe mensaje genérico.
        console.warn('[RBAC_FORBIDDEN]', e.code, e.details ?? {});

        return NextResponse.json({ message: 'Permiso denegado' }, { status: 403 });
      }

      // Errores no-RBAC (incluye TenantError 'UNAUTHORIZED' del @read_only del pool):
      // no los tragamos, los relanza para el manejo de error existente de la ruta.
      throw e;
    }
  }
}
