import { NextResponse } from 'next/server'

import { authenticator } from '@otplib/preset-default'

import { 
  prisma, 
  getTotpSecretForLogin, 
  markTotpFactorFailedAttempt, 
  markTotpFactorUsed, 
  validateMfaChallenge,
  markMfaSuccess,
  markMfaFailed,
  deleteMfaChallenge,
  writeAuthAudit, 
  getPlatformRole 
} from '@gaso/shared'

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const username = String(body.username ?? '').trim()
    const password = String(body.password ?? '')
    const challengeId = String(body.challengeId ?? '').trim()
    const mfaCode = String(body.mfaCode ?? '').trim()

    const user = await prisma.gASOCO_Cat_Usuarios.findFirst({
      select: {
        IdUsuario: true,
        Nombre: true,
        Email: true,
        IdPerfil: true,
        isAdmin: true,
        IdArea: true,
        IdBaseCiudad: true,
        IdRegion: true,
        IdPuesto: true,
        IdEmpresa: true,
        TenantID: true,
        Estatus: true
      },
      where: {
        Usuario: {
          equals: username
        },
        Password: {
          equals: password
        },
        Estatus: {
          equals: 'A'
        }
      }
    })

    if (!user || !user.IdUsuario) {
      await writeAuthAudit({
        eventType: 'LOGIN_FAILED',
        eventStatus: 'FAILED',
        tenantId: 'PLATFORM',
        tenantSlug: 'platform',
        username,
        reason: 'INVALID_CREDENTIALS'
      })

      return NextResponse.json(
        { message: ['Invalid credentials'] },
        { status: 401, statusText: 'Unauthorized' }
      )
    }

    const platformRole = await getPlatformRole(user.IdUsuario)

    if (!platformRole) {
      await writeAuthAudit({
        eventType: 'LOGIN_FAILED',
        eventStatus: 'FAILED',
        tenantId: 'PLATFORM',
        tenantSlug: 'platform',
        username,
        userId: user.IdUsuario,
        email: user.Email ?? null,
        reason: 'NOT_PLATFORM_ADMIN'
      })

      return NextResponse.json(
        { message: ['Not authorized as platform admin'] },
        { status: 403, statusText: 'Forbidden' }
      )
    }

    if (!challengeId || !mfaCode) {
      await writeAuthAudit({
        eventType: 'MFA_FAILED',
        eventStatus: 'FAILED',
        tenantId: 'PLATFORM',
        tenantSlug: 'platform',
        username,
        userId: user.IdUsuario,
        email: user.Email ?? null,
        reason: 'MISSING_MFA'
      })

      return NextResponse.json(
        { message: ['MFA code is required'] },
        { status: 401, statusText: 'MFA Required' }
      )
    }

    const challengeResult = await validateMfaChallenge({
      challengeId,
      userId: user.IdUsuario,
      expectedTenantId: 'PLATFORM'
    })

    if (!challengeResult.valid) {
      const errorMessages: Record<string, string> = {
        'NOT_FOUND': 'Invalid MFA challenge',
        'EXPIRED': 'MFA challenge expired',
        'MAX_ATTEMPTS': 'Too many MFA attempts',
        'INVALID_USER': 'Invalid MFA challenge',
        'INVALID_TENANT': 'Invalid MFA challenge'
      }

      await writeAuthAudit({
        eventType: 'MFA_FAILED',
        eventStatus: 'FAILED',
        tenantId: 'PLATFORM',
        tenantSlug: 'platform',
        username,
        userId: user.IdUsuario,
        email: user.Email ?? null,
        reason: errorMessages[challengeResult.error!] || 'MFA validation failed'
      })

      await markMfaFailed(challengeId)

      return NextResponse.json(
        { message: [errorMessages[challengeResult.error!] || 'MFA validation failed'] },
        { status: 401, statusText: 'Invalid MFA Challenge' }
      )
    }

    const userTotpSecret = await getTotpSecretForLogin({
      tenantId: 'PLATFORM',
      userId: user.IdUsuario
    })

    if (!userTotpSecret) {
      await writeAuthAudit({
        eventType: 'MFA_FAILED',
        eventStatus: 'FAILED',
        tenantId: 'PLATFORM',
        tenantSlug: 'platform',
        username,
        userId: user.IdUsuario,
        email: user.Email ?? null,
        reason: 'MFA_FACTOR_NOT_CONFIGURED'
      })

      return NextResponse.json(
        { message: ['MFA factor is not configured'] },
        { status: 401, statusText: 'MFA Factor Not Configured' }
      )
    }

    const isValidMfa = authenticator.check(mfaCode, userTotpSecret)

    if (!isValidMfa) {
      await markMfaFailed(challengeId)

      await markTotpFactorFailedAttempt({
        tenantId: 'PLATFORM',
        userId: user.IdUsuario
      })

      await writeAuthAudit({
        eventType: 'MFA_FAILED',
        eventStatus: 'FAILED',
        tenantId: 'PLATFORM',
        tenantSlug: 'platform',
        username,
        userId: user.IdUsuario,
        email: user.Email ?? null,
        reason: 'INVALID_MFA_CODE',
        metadata: {
          attempts: challengeResult.challenge!.attempts + 1,
          maxAttempts: challengeResult.challenge!.maxAttempts
        }
      })

      return NextResponse.json(
        { message: ['Invalid MFA code'] },
        { status: 401, statusText: 'Invalid MFA Code' }
      )
    }

    await markMfaSuccess(challengeId)

    await markTotpFactorUsed({
      tenantId: 'PLATFORM',
      userId: user.IdUsuario
    })

    await writeAuthAudit({
      eventType: 'MFA_SUCCESS',
      eventStatus: 'SUCCESS',
      tenantId: 'PLATFORM',
      tenantSlug: 'platform',
      username,
      userId: user.IdUsuario,
      email: user.Email ?? null
    })

    await writeAuthAudit({
      eventType: 'LOGIN_SUCCESS',
      eventStatus: 'SUCCESS',
      tenantId: 'PLATFORM',
      tenantSlug: 'platform',
      username,
      userId: user.IdUsuario,
      email: user.Email ?? null
    })

    // Clean up the challenge after successful login
    await deleteMfaChallenge(challengeId)

    return NextResponse.json({
      id: user.IdUsuario,
      name: user.Nombre,
      email: user.Email,
      admin: user.isAdmin === 1 ? true : false,
      area: user.IdArea,
      cityBase: user.IdBaseCiudad,
      company: user.IdEmpresa,
      profile: user.IdPerfil,
      position: user.IdPuesto,
      region: user.IdRegion,
      image: 'https://gaso-erp.com/dist/img/gasologo.png',
      tenantId: null,
      tenantSlug: null,
      tenantName: null,
      platformRole
    })
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e ?? 'Unknown error')
    const errorName = e instanceof Error ? e.name : 'UnknownError'

    console.error('[ADMIN_LOGIN_ROUTE_ERROR]', {
      name: errorName,
      message: errorMessage
    })

    return NextResponse.json(
      { message: ['Server error while validating login'] },
      { status: 500, statusText: 'Internal Server Error' }
    )
  }
}
