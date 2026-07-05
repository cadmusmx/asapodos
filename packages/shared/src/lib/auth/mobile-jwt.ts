import { SignJWT, jwtVerify } from 'jose';

const ALG = 'HS256';

function getSecret(): Uint8Array {
  const secret = process.env.MOBILE_JWT_SECRET;

  if (!secret) throw new Error('MOBILE_JWT_SECRET is not configured');

  return new TextEncoder().encode(secret);
}

export const MOBILE_TOKEN_TTL_SECONDS = Number(process.env.MOBILE_JWT_TTL_SECONDS) || 86400;

export interface MobileTokenClaims {
  sub: string; // IdUsuario como string
  tenantId: string;
  name?: string | null;
  email?: string | null;
  admin?: boolean;
}

export async function signMobileToken(
  claims: MobileTokenClaims,
  ttlSeconds: number = MOBILE_TOKEN_TTL_SECONDS
): Promise<{ accessToken: string; expiresIn: number }> {
  const accessToken = await new SignJWT({
    tenantId: claims.tenantId,
    name: claims.name ?? null,
    email: claims.email ?? null,
    admin: claims.admin ?? false
  })
    .setProtectedHeader({ alg: ALG })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(getSecret());

  return { accessToken, expiresIn: ttlSeconds };
}

export interface VerifiedMobileToken {
  userId: number;
  tenantId: string;
  name: string | null;
  email: string | null;
  admin: boolean;
}

export async function verifyMobileToken(token: string): Promise<VerifiedMobileToken | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: [ALG] });

    const tenantId = typeof payload.tenantId === 'string' ? payload.tenantId : null;
    const userId = payload.sub ? Number(payload.sub) : NaN;

    if (!tenantId || !Number.isInteger(userId) || userId <= 0) return null;

    return {
      userId,
      tenantId,
      name: typeof payload.name === 'string' ? payload.name : null,
      email: typeof payload.email === 'string' ? payload.email : null,
      admin: payload.admin === true
    };
  } catch {
    return null;
  }
}