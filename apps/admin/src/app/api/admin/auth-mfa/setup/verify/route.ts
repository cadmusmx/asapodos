import { NextResponse } from 'next/server'

import { authenticator } from '@otplib/preset-default'

import {
  prisma,
  writeAuthAudit,
  setTenantContext
} from '@gaso/shared'

const ADMIN_DOMAIN = process.env.ADMIN_TENANT ?? 'gasohub.com'

async function safeWriteAudit(params: Parameters<typeof writeAuthAudit>[0]) {
  try {
    await writeAuthAudit(params)
  } catch (error) {
    console.error('[AUDIT_ERROR]', error)
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const username = String(body.username ?? '').trim()
    const password = String(body.password ?? '')
    const setupId = String(body.setupId ?? '').trim()
    const mfaCode = String(body.mfaCode ?? '').trim()

    if (!username || !password || !setupId || !mfaCode) {
      return NextResponse.json(
        { ok: false, message: ['User, password, setupId and MFA code are required'] },
        { status: 400 }
      )
    }

    const adminTenant = await prisma.$queryRaw<{ TenantID: string }[]>`
      SELECT
        TenantID
      FROM Security.Tenants
      WHERE LOWER(Dominio) = LOWER(${ADMIN_DOMAIN})
    `

    if (!adminTenant[0]?.TenantID) {
      return NextResponse.json(
        { ok: false, message: ['Admin tenant not found'] },
        { status: 500 }
      )
    }

    const tenantId = adminTenant[0].TenantID

    await setTenantContext(tenantId)

    const user = await prisma.gASOCO_Cat_Usuarios.findFirst({
      select: {
        IdUsuario: true,
        Usuario: true,
        Nombre: true,
        Email: true,
        TenantID: true
      },
      where: {
        Usuario: { equals: username },
        Password: { equals: password },
        Estatus: { equals: 'A' }
      }
    })

    if (!user || !user.IdUsuario) {
      await safeWriteAudit({
        eventType: 'LOGIN_FAILED',
        eventStatus: 'FAILED',
        tenantId: tenantId,
        tenantSlug: 'gaso-admin-platform',
        username,
        reason: 'INVALID_CREDENTIALS_MFA_SETUP_VERIFY'
      })

      return NextResponse.json(
        { ok: false, message: ['Invalid credentials'] },
        { status: 401 }
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
      await safeWriteAudit({
        eventType: 'MFA_FAILED',
        eventStatus: 'FAILED',
        tenantId: tenantId,
        tenantSlug: 'gaso-admin-platform',
        username,
        userId: user.IdUsuario,
        email: user.Email ?? null,
        reason: 'MFA_SETUP_FACTOR_NOT_FOUND'
      })

      return NextResponse.json(
        { ok: false, message: ['MFA setup factor was not found or is already verified'] },
        { status: 404 }
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

      await safeWriteAudit({
        eventType: 'MFA_FAILED',
        eventStatus: 'FAILED',
        tenantId: tenantId,
        tenantSlug: 'gaso-admin-platform',
        username,
        userId: user.IdUsuario,
        email: user.Email ?? null,
        reason: 'INVALID_MFA_SETUP_CODE',
        metadata: { setupId, factorType: 'TOTP' }
      })

      return NextResponse.json(
        { ok: false, message: ['Invalid MFA setup code'] },
        { status: 401 }
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

    await safeWriteAudit({
      eventType: 'MFA_SUCCESS',
      eventStatus: 'SUCCESS',
      tenantId: tenantId,
      tenantSlug: 'gaso-admin-platform',
      username,
      userId: user.IdUsuario,
      email: user.Email ?? null,
      reason: 'MFA_SETUP_VERIFIED',
      metadata: {
        setupId,
        factorType: 'TOTP',
        provider: 'GoogleAuthenticator'
      }
    })

    return NextResponse.json({
      ok: true,
      verified: true,
      requiresMfaSetup: false,
      message: ['MFA setup verified successfully']
    })
  } catch (error) {
    console.error('[ADMIN_MFA_SETUP_VERIFY_ERROR]', error)

    return NextResponse.json(
      { ok: false, message: ['Server error while verifying MFA setup'] },
      { status: 500 }
    )
  }
}
