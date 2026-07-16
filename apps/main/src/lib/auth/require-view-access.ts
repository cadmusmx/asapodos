import { headers } from 'next/headers';

import { getServerSession } from 'next-auth';

import {
  getTenantFromHeaders,
  requirePermission,
  PERM,
  ForbiddenError,
  UnauthorizedError,
  authOptions
} from '@gaso/shared';

/**
 * Guard RBAC para SERVER COMPONENTS (páginas/layouts).
 * Equivalente a withPermission pero sin Request: resuelve la sesión vía NextAuth
 * y el tenant desde los headers que el middleware ya inyectó (x-tenant-id).
 *
 * Devuelve un resultado discriminado para que el call-site decida el redirect
 * (las páginas no lanzan 401/403, redirigen).
 */

export type ViewAccessReason = 'UNAUTHENTICATED' | 'MISSING_TENANT' | 'FORBIDDEN' | 'PLAN_RESTRICTED';

export type ViewAccessResult =
  | { ok: true; userId: number; tenantId: string; mask: number }
  | { ok: false; reason: ViewAccessReason };


export async function requireViewAccess(
  viewCode: string,
  bit: number = PERM.R
): Promise<ViewAccessResult> {
  const session = await getServerSession(authOptions);

  if (!session?.user || typeof session.user.id !== 'number') {
    return { ok: false, reason: 'UNAUTHENTICATED' };
  }

  let tenantId: string;

  try {
    // headers() es async en Next 15
    const h = await headers();

    tenantId = getTenantFromHeaders(h).id;
  } catch {
    return { ok: false, reason: 'MISSING_TENANT' };
  }

  // La sesión (si trae tenant) debe coincidir con el header.
  if (session.user.tenantId && session.user.tenantId.toLowerCase() !== tenantId.toLowerCase()) {
    return { ok: false, reason: 'FORBIDDEN' };
  }

  try {
    const { mask } = await requirePermission({ tenantId, idUsuario: session.user.id }, viewCode, bit);

    return { ok: true, userId: session.user.id, tenantId, mask };
  } catch (e) {
    if (e instanceof UnauthorizedError) return { ok: false, reason: 'UNAUTHENTICATED' };
    if (e instanceof ForbiddenError) {
      // Distinguir "por plan" de "por permiso" (el code viaja en el error del core).
      return { ok: false, reason: e.code === 'PLAN_RESTRICTED' ? 'PLAN_RESTRICTED' : 'FORBIDDEN' };
    }
    throw e; // errores no-RBAC (incl. @read_only del pool) se propagan
  }
}

const REASON_TARGETS: Record<ViewAccessReason, string> = {
  UNAUTHENTICATED: '/login',
  MISSING_TENANT: '/pages/misc/401-not-authorized',
  FORBIDDEN: '/pages/misc/401-not-authorized',
  PLAN_RESTRICTED: '/pages/misc/401-not-authorized?reason=plan',
};

export function getTargetByReason(reason: ViewAccessReason): string {
  return REASON_TARGETS[reason] ?? '/login';
}
