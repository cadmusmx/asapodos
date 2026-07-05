import { getServerSession } from 'next-auth';

import { authOptions } from './nextauth-config';
import type { PlatformRole } from '../../types/next-auth';

export type PlatformGuardResult =
  | {
    ok: true
    userId: number
    platformRole: PlatformRole
  }
  | {
    ok: false
    status: 401 | 403
    message: string
  };

export async function requirePlatformRole(
  requiredRole?: PlatformRole
): Promise<PlatformGuardResult> {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return { ok: false, status: 401, message: 'No autenticado' };
  }

  const { id, platformRole } = session.user;

  if (typeof id !== 'number') {
    return { ok: false, status: 401, message: 'Sesión sin identificador de usuario válido' };
  }

  if (!platformRole) {
    return { ok: false, status: 403, message: 'Acceso de plataforma requerido' };
  }

  if (requiredRole && platformRole !== requiredRole) {
    return { ok: false, status: 403, message: `Rol ${requiredRole} requerido` };
  }

  return { ok: true, userId: id, platformRole };
}
