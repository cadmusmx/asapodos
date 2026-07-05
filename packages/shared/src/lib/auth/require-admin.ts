import { getServerSession } from 'next-auth';

import { authOptions } from './nextauth-config';

export type AdminGuardResult =
  | {
    ok: true
    userId: number
    tenantId: string // tenant de la sesión del actor
    isSaasAdmin: boolean
  }
  | {
    ok: false
    status: 401 | 403
    message: string
  };


/**
 * Tenant raíz/administrativo del SaaS. Un admin cuyo tenant coincide con este
 * se considera "Admin" y puede filtrar la auditoría por cualquier tenant.
 *
 * Se deja en entorno (no hard-codeado) para facilitar la migración y no atar el GUID al código.
 */
const SAAS_ROOT_TENANT_ID = process.env.SAAS_ROOT_TENANT_ID ?? '';

/**
 * Ya no se usa en Auditoria de `apps/main` se deja para `apps/admin` (auditoría global)
 */
export async function requireAdmin(): Promise<AdminGuardResult> {
  const session = await getServerSession(authOptions);

  if (!session?.user) return { ok: false, status: 401, message: 'No autenticado' };

  const { admin, tenantId, id } = session.user;

  if (admin !== true) return { ok: false, status: 403, message: 'Se requiere rol administrador' };
  if (typeof id !== 'number') return { ok: false, status: 401, message: 'Sesión sin identificador de usuario válido' };

  // Derivación provisional de admin SaaS. Si SAAS_ROOT_TENANT_ID no está
  // configurado, NADIE es SaaS admin (fallback seguro: nunca abrir cross-tenant por accidente de configuración).
  const isSaasAdmin = SAAS_ROOT_TENANT_ID !== '' && tenantId.toLowerCase() === SAAS_ROOT_TENANT_ID.toLowerCase();

  return { ok: true, userId: id, tenantId, isSaasAdmin };
}
