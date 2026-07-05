import { NextResponse } from 'next/server'

import { authenticator } from '@otplib/preset-default'

import {
  prisma,
  getTenantFromHeaders,
  setTenantContext,
  getTotpSecretForLogin,
  markTotpFactorFailedAttempt,
  markTotpFactorUsed,
  validateMfaChallenge,
  markMfaFailed,
  markMfaSuccess,
  writeAuthAudit,
  ID_ORIGIN_WEB,
  signMobileToken
} from '@gaso/shared'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const { id: tenantId, slug: tenantSlug, name: tenantName } = getTenantFromHeaders(req.headers)

    await setTenantContext(tenantId)

    // DIFF 1 vs /api/login: origen móvil (APP) para auditoría.
    const idOriginRaw = req.headers.get('x-origin-id')
    const idOrigin = idOriginRaw !== null ? Number(idOriginRaw) : ID_ORIGIN_WEB

    const body = await req.json()
    const username = String(body.username ?? '').trim()
    const password = String(body.password ?? '')
    const challengeId = String(body.challengeId ?? '').trim()
    const mfaCode = String(body.mfaCode ?? '').trim()

    // Check de estado del tenant (igual que /api/login): 403 antes de emitir nada.
    const [tenantStatus] = await prisma.$queryRaw<Array<{ Status: string }>>`
      SELECT Status FROM Security.Tenants WHERE TenantID = CAST(${tenantId} AS uniqueidentifier)
    `

    if (!tenantStatus || (tenantStatus.Status !== 'ACTIVE' && tenantStatus.Status !== 'TRIAL')) {
      await writeAuthAudit({
        eventType: 'LOGIN_FAILED', eventStatus: 'FAILED',
        tenantId, tenantSlug, username, reason: 'TENANT_SUSPENDED', idOrigin
      })

      return NextResponse.json(
        { ok: false, code: 'TENANT_SUSPENDED', message: ['Organization is suspended. Contact your administrator.'] },
        { status: 403, statusText: 'Tenant Suspended' }
      )
    }

    // Credenciales
    const user = await prisma.gASOCO_Cat_Usuarios.findFirst({
      select: { IdUsuario: true, Nombre: true, Email: true, isAdmin: true, TenantID: true },
      where: {
        Usuario: { equals: username },
        Password: { equals: password },
        Estatus: { equals: 'A' }
      }
    })

    if (!user || !user.IdUsuario) {
      await writeAuthAudit({
        eventType: 'LOGIN_FAILED', eventStatus: 'FAILED',
        tenantId, tenantSlug, username, reason: 'INVALID_CREDENTIALS', idOrigin
      })

      return NextResponse.json(
        { ok: false, code: 'INVALID_CREDENTIALS', message: ['User or Password is invalid'] },
        { status: 401, statusText: 'Unauthorized Access' }
      )
    }

    if (!challengeId || !mfaCode) {
      await writeAuthAudit({
        eventType: 'MFA_FAILED', eventStatus: 'FAILED',
        tenantId, tenantSlug, username, userId: user.IdUsuario, email: user.Email ?? null,
        reason: 'MISSING_MFA', idOrigin
      })

      return NextResponse.json(
        { ok: false, code: 'MFA_REQUIRED', message: ['MFA code is required'] },
        { status: 401, statusText: 'MFA Required' }
      )
    }

    // Validación del challenge (store en DB): colapsa expiración, intentos, usuario y tenant.
    const challengeResult = await validateMfaChallenge({
      challengeId,
      userId: user.IdUsuario,
      expectedTenantId: tenantId
    })

    if (!challengeResult.valid) {
      const codeByError: Record<string, { code: string; message: string }> = {
        NOT_FOUND: { code: 'MFA_INVALID', message: 'Invalid MFA challenge' },
        INVALID_USER: { code: 'MFA_INVALID', message: 'Invalid MFA challenge' },
        INVALID_TENANT: { code: 'MFA_INVALID', message: 'Invalid MFA challenge' },
        EXPIRED: { code: 'MFA_EXPIRED', message: 'MFA challenge expired' },
        MAX_ATTEMPTS: { code: 'MFA_INVALID', message: 'Too many MFA attempts' }
      }

      const mapped = codeByError[challengeResult.error!] ?? {
        code: 'MFA_INVALID',
        message: 'MFA validation failed'
      }

      await writeAuthAudit({
        eventType: 'MFA_FAILED', eventStatus: 'FAILED',
        tenantId, tenantSlug, username, userId: user.IdUsuario, email: user.Email ?? null,
        reason: challengeResult.error ?? 'MFA_VALIDATION_FAILED', idOrigin
      })

      return NextResponse.json(
        { ok: false, code: mapped.code, message: [mapped.message] },
        { status: 401 }
      )
    }

    const userTotpSecret = await getTotpSecretForLogin({ tenantId, userId: user.IdUsuario })

    if (!userTotpSecret) {
      await writeAuthAudit({
        eventType: 'MFA_FAILED', eventStatus: 'FAILED',
        tenantId, tenantSlug, username, userId: user.IdUsuario, email: user.Email ?? null,
        reason: 'MFA_FACTOR_NOT_CONFIGURED', idOrigin
      })

      return NextResponse.json(
        { ok: false, code: 'MFA_INVALID', message: ['MFA factor is not configured'] },
        { status: 401, statusText: 'MFA Factor Not Configured' }
      )
    }

    const isValidMfa = authenticator.check(mfaCode, userTotpSecret)

    if (!isValidMfa) {
      await markMfaFailed(challengeId)
      await markTotpFactorFailedAttempt({ tenantId, userId: user.IdUsuario })

      await writeAuthAudit({
        eventType: 'MFA_FAILED', eventStatus: 'FAILED',
        tenantId, tenantSlug, username, userId: user.IdUsuario, email: user.Email ?? null,
        reason: 'INVALID_MFA_CODE',
        metadata: {
          attempts: challengeResult.challenge!.attempts + 1,
          maxAttempts: challengeResult.challenge!.maxAttempts
        },
        idOrigin
      })

      return NextResponse.json(
        { ok: false, code: 'MFA_INVALID', message: ['Invalid MFA code'] },
        { status: 401, statusText: 'Invalid MFA Code' }
      )
    }

    // MFA OK
    await markMfaSuccess(challengeId)
    await markTotpFactorUsed({ tenantId, userId: user.IdUsuario })

    await writeAuthAudit({
      eventType: 'MFA_SUCCESS', eventStatus: 'SUCCESS',
      tenantId, tenantSlug, username, userId: user.IdUsuario, email: user.Email ?? null, idOrigin
    })
    await writeAuthAudit({
      eventType: 'LOGIN_SUCCESS', eventStatus: 'SUCCESS',
      tenantId, tenantSlug, username, userId: user.IdUsuario, email: user.Email ?? null, idOrigin
    })

    // DIFF 2 vs /api/login: firmar JWT en vez de devolver el user para cookie.
    const admin = Boolean(user.isAdmin)

    const { accessToken, expiresIn } = await signMobileToken({
      sub: String(user.IdUsuario),
      tenantId,
      name: user.Nombre ?? null,
      email: user.Email ?? null,
      admin
    })

    return NextResponse.json({
      id: user.IdUsuario,
      name: user.Nombre,
      email: user.Email,
      admin,
      tenantId,
      tenantSlug,
      tenantName,
      accessToken,
      tokenType: 'Bearer',
      expiresIn
    })
  } catch (e) {
    console.error('[mobile/login] real error:', e)

    return NextResponse.json(
      { ok: false, code: 'SERVER_ERROR', message: ['Server error while validating login'] },
      { status: 500 }
    )
  }
}
