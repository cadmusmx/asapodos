// Third-party Imports
import { NextResponse } from 'next/server'

import { authenticator } from '@otplib/preset-default'

// Tools
import {
  prisma,
  getTenantFromHeaders,
  setTenantContext,
  ID_ORIGIN_WEB,
  getUserTotpSecret,
  writeAuthAudit
} from '@gaso/shared'

function maskEmail(email: string | null | undefined) {
  if (!email || !email.includes('@')) return null

  const [name, domain] = email.split('@')
  const safeName = name.length <= 1 ? `${name}*` : `${name[0]}*****`

  return `${safeName}@${domain}`
}

export async function POST(req: Request) {
  try {
    const { id: tenantId, slug: tenantSlug } = getTenantFromHeaders(req.headers)

    await setTenantContext(tenantId)

    const idOriginRaw = req.headers.get('x-origin-id')
    const idOrigin = idOriginRaw !== null ? Number(idOriginRaw) : ID_ORIGIN_WEB

    const body = await req.json()

    const username = String(body.username ?? '').trim()
    const password = String(body.password ?? '')

    if (!username || !password) {
      await writeAuthAudit({
        eventType: 'LOGIN_FAILED',
        eventStatus: 'FAILED',
        tenantId,
        tenantSlug,
        username,
        reason: 'MISSING_CREDENTIALS_MFA_SETUP',
        idOrigin
      })

      return NextResponse.json(
        {
          ok: false,
          message: ['User and password are required']
        },
        {
          status: 400,
          statusText: 'Bad Request'
        }
      )
    }

    const user = await prisma.gASOCO_Cat_Usuarios.findFirst({
      select: {
        IdUsuario: true,
        Usuario: true,
        Nombre: true,
        Email: true,
        TenantID: true
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
        tenantId,
        tenantSlug,
        username,
        reason: 'INVALID_CREDENTIALS_MFA_SETUP',
        idOrigin
      })

      return NextResponse.json(
        {
          ok: false,
          message: ['User or Password is invalid']
        },
        {
          status: 401,
          statusText: 'Unauthorized Access'
        }
      )
    }

    const existingVerifiedSecret = await getUserTotpSecret({
      tenantId,
      userId: user.IdUsuario
    })

    if (existingVerifiedSecret) {
      return NextResponse.json({
        ok: true,
        alreadyConfigured: true,
        requiresMfaSetup: false,
        message: ['MFA is already configured for this user']
      })
    }

    const secret = authenticator.generateSecret()
    const issuer = 'Gaso-SaaS'
    const accountName = user.Email ?? username

    const otpauthUrl = authenticator.keyuri(accountName, issuer, secret)

    await prisma.$executeRaw`
      UPDATE Security.UserMfaFactors
      SET
        IsEnabled = 0,
        DisabledAt = SYSUTCDATETIME(),
        UpdatedAt = SYSUTCDATETIME(),
        UpdatedBy = 'AUTH_MFA_SETUP_REPLACED'
      WHERE TenantID = CAST(${tenantId} AS uniqueidentifier)
        AND IdUsuario = ${user.IdUsuario}
        AND FactorType = 'TOTP'
        AND IsVerified = 0
        AND IsEnabled = 1
    `

    const insertedRows = await prisma.$queryRaw<{ MfaFactorID: string }[]>`
      DECLARE @NewMfaFactorID uniqueidentifier = NEWID();

      INSERT INTO Security.UserMfaFactors (
        MfaFactorID,
        TenantID,
        IdUsuario,
        FactorType,
        Provider,
        SecretEncrypted,
        PhoneMasked,
        EmailMasked,
        IsEnabled,
        IsVerified,
        CreatedAt,
        VerifiedAt,
        UpdatedAt,
        LastUsedAt,
        DisabledAt,
        FailedAttempts,
        LastFailedAt,
        CreatedBy,
        UpdatedBy
      )
      VALUES (
        @NewMfaFactorID,
        CAST(${tenantId} AS uniqueidentifier),
        ${user.IdUsuario},
        'TOTP',
        'GoogleAuthenticator',
        ${secret},
        NULL,
        ${maskEmail(user.Email)},
        1,
        0,
        SYSUTCDATETIME(),
        NULL,
        NULL,
        NULL,
        NULL,
        0,
        NULL,
        'AUTH_MFA_SETUP',
        NULL
      );

      SELECT CONVERT(nvarchar(36), @NewMfaFactorID) AS MfaFactorID;
    `

    const setupId = insertedRows[0]?.MfaFactorID ?? null

    await writeAuthAudit({
      eventType: 'MFA_SETUP_STARTED',
      eventStatus: 'SUCCESS',
      tenantId,
      tenantSlug,
      username,
      userId: user.IdUsuario,
      email: user.Email ?? null,
      metadata: {
        setupId,
        factorType: 'TOTP',
        provider: 'GoogleAuthenticator'
      },
      idOrigin
    })

    return NextResponse.json({
      ok: true,
      requiresMfaSetup: true,
      setupId,
      factorType: 'TOTP',
      provider: 'GoogleAuthenticator',
      issuer,
      accountName,
      otpauthUrl,
      manualKey: secret
    })
  } catch (error) {
    console.error('[MFA_SETUP_START_ERROR]', {
      message: error instanceof Error ? error.message : 'Unknown error'
    })

    return NextResponse.json(
      {
        ok: false,
        message: ['Server error while starting MFA setup']
      },
      {
        status: 500,
        statusText: 'MFA Setup Error'
      }
    )
  }
}
