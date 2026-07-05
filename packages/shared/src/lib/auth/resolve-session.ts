import { getServerSession } from 'next-auth';
import { authOptions } from './nextauth-config';
import { verifyMobileToken } from './mobile-jwt';

export interface AuthContext {
  userId: number;
  tenantId: string | null;
  email: string | null;
  name: string | null;
  admin: boolean;
  source: 'cookie' | 'bearer';
}

// Exportada para poder probar el parseo en aislamiento (no va al barrel).
export function extractBearer(headers: Headers): string | null {
  const raw = headers.get('authorization');

  if (!raw) return null;

  const [scheme, token] = raw.split(' ');

  if (!scheme || scheme.toLowerCase() !== 'bearer' || !token) return null;

  return token.trim() || null;
}

export async function resolveSession(req: Request): Promise<AuthContext | null> {
  // 1) Cookie de NextAuth (web)
  const session = await getServerSession(authOptions);

  if (session?.user && typeof session.user.id === 'number') {
    return {
      userId: session.user.id,
      tenantId: session.user.tenantId ?? null,
      email: session.user.email ?? null,
      name: session.user.name ?? null,
      admin: session.user.admin === true,
      source: 'cookie'
    };
  }

  // 2) Bearer JWT (móvil)
  const token = extractBearer(req.headers);

  if (token) {
    const verified = await verifyMobileToken(token);

    if (verified) {
      return {
        userId: verified.userId,
        tenantId: verified.tenantId,
        email: verified.email,
        name: verified.name,
        admin: verified.admin,
        source: 'bearer'
      };
    }
  }

  return null;
}
