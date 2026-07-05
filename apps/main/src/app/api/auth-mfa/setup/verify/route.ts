// Third-party Imports
import { NextResponse } from 'next/server'

import { authenticator } from '@otplib/preset-default'

// Tools
import {
  prisma,
  getTenantFromHeaders,
  setTenantContext,
  ID_ORIGIN_WEB,
  writeAuthAudit
} from '@gaso/shared'

export async function POST(req: Request) {
  try {
    const { id: tenantId, slug: tenantSlug } = getTenantFromHeaders(req.headers)

    await setTenantContext(tenantId)

    const idOriginRaw = req.headers.get('x-origin-id')
    const idOrigin = idOriginRaw !== null ? Number(idOriginRaw) : ID_ORIGIN_WEB

    const body = await req.json()

    const username = String(body.username ?? '').trim()
    const password = String(body.password ?? '')
    const setupId = String(body.setupId ?? '').trim()
    const mfaCode = String(body.mfaCode ?? '').trim()

    if (!username || !password || !setupId || !mfaCode) {
      return NextResponse.json(
        {
          ok: false,
          message: ['User, password, setupId and MFA code are required']
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
        reason: 'INVALID_CREDENTIALS_MFA_SETUP_VERIFY',
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

    const factors = await prisma.$queryRaw<
      {
        MfaFactorID: string
        SecretEncrypted: string | null
        FailedAttempts: number
      }[]
    >`
      SELECT TOP 1
        CONVERT(nvarchar(36), MfaFactorID) AS MfaFactorID,
        SecretEncrypted,
        FailedAttempts
      FROM Security.UserMfaFactors
      WHERE MfaFactorID = CAST(${setupId} AS uniqueidentifier)
        AND TenantID = CAST(${tenantId} AS uniqueidentifier)
        AND IdUsuario = ${user.IdUsuario}
        AND FactorType = 'TOTP'
        AND IsEnabled = 1
        AND IsVerified = 0
      ORDER BY CreatedAt DESC
    `

    const factor = factors[0]

    if (!factor || !factor.SecretEncrypted) {
      await writeAuthAudit({
        eventType: 'MFA_FAILED',
        eventStatus: 'FAILED',
        tenantId,
        tenantSlug,
        username,
        userId: user.IdUsuario,
        email: user.Email ?? null,
        reason: 'MFA_SETUP_FACTOR_NOT_FOUND',
        idOrigin
      })

      return NextResponse.json(
        {
          ok: false,
          message: ['MFA setup factor was not found or is already verified']
        },
        {
          status: 404,
          statusText: 'MFA Setup Not Found'
        }
      )
    }

    const isValidMfa = authenticator.check(mfaCode, factor.SecretEncrypted)

    if (!isValidMfa) {
      await prisma.$executeRaw`
        UPDATE Security.UserMfaFactors
        SET
          FailedAttempts = ISNULL(FailedAttempts, 0) + 1,
          LastFailedAt = SYSUTCDATETIME(),
          UpdatedAt = SYSUTCDATETIME(),
          UpdatedBy = 'AUTH_MFA_SETUP_VERIFY'
        WHERE MfaFactorID = CAST(${setupId} AS uniqueidentifier)
          AND TenantID = CAST(${tenantId} AS uniqueidentifier)
          AND IdUsuario = ${user.IdUsuario}
          AND FactorType = 'TOTP'
          AND IsEnabled = 1
          AND IsVerified = 0
      `

      await writeAuthAudit({
        eventType: 'MFA_FAILED',
        eventStatus: 'FAILED',
        tenantId,
        tenantSlug,
        username,
        userId: user.IdUsuario,
        email: user.Email ?? null,
        reason: 'INVALID_MFA_SETUP_CODE',
        metadata: {
          setupId,
          factorType: 'TOTP'
        },
        idOrigin
      })

      return NextResponse.json(
        {
          ok: false,
          message: ['Invalid MFA setup code']
        },
        {
          status: 401,
          statusText: 'Invalid MFA Setup Code'
        }
      )
    }

    await prisma.$executeRaw`
      UPDATE Security.UserMfaFactors
      SET
        IsVerified = 1,
        VerifiedAt = SYSUTCDATETIME(),
        FailedAttempts = 0,
        LastFailedAt = NULL,
        UpdatedAt = SYSUTCDATETIME(),
        UpdatedBy = 'AUTH_MFA_SETUP_VERIFY'
      WHERE MfaFactorID = CAST(${setupId} AS uniqueidentifier)
        AND TenantID = CAST(${tenantId} AS uniqueidentifier)
        AND IdUsuario = ${user.IdUsuario}
        AND FactorType = 'TOTP'
        AND IsEnabled = 1
        AND IsVerified = 0
    `

    await writeAuthAudit({
      eventType: 'MFA_SUCCESS',
      eventStatus: 'SUCCESS',
      tenantId,
      tenantSlug,
      username,
      userId: user.IdUsuario,
      email: user.Email ?? null,
      reason: 'MFA_SETUP_VERIFIED',
      metadata: {
        setupId,
        factorType: 'TOTP',
        provider: 'GoogleAuthenticator'
      },
      idOrigin
    })

    return NextResponse.json({
      ok: true,
      verified: true,
      requiresMfaSetup: false,
      message: ['MFA setup verified successfully']
    })
  } catch (error) {
    console.error('[MFA_SETUP_VERIFY_ERROR]', {
      message: error instanceof Error ? error.message : 'Unknown error'
    })

    return NextResponse.json(
      {
        ok: false,
        message: ['Server error while verifying MFA setup']
      },
      {
        status: 500,
        statusText: 'MFA Setup Verify Error'
      }
    )
  }
}
