// apps\admin\src\app\api\admin\auth-mfa\setup\start\route.ts
import { NextResponse } from 'next/server'

import { authenticator } from '@otplib/preset-default'

import {
  prisma,
  writeAuthAudit,
  getUserTotpSecret,
  setTenantContext,
  withTenantContext
} from '@gaso/shared'

function maskEmail(email: string | null | undefined) {
  if (!email || !email.includes('@')) return null

  const [name, domain] = email.split('@')
  const safeName = name.length <= 1 ? `${name}*` : `${name[0]}*****`

  return `${safeName}@${domain}`
}

const ADMIN_TENANT = process.env.ADMIN_TENANT ?? 'gasohub.com'

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

    const adminTenant = await prisma.$queryRaw<{ TenantID: string }[]>`
      SELECT
        TenantID
      FROM Security.Tenants
      WHERE LOWER(Dominio) = LOWER(${ADMIN_TENANT})
    `

    if (!adminTenant[0]?.TenantID) {
      return NextResponse.json(
        { ok: false, message: ['Admin tenant not found'] },
        { status: 500 }
      )
    }

    const tenantId = adminTenant[0].TenantID

    await setTenantContext(tenantId)

    if (!username || !password) {
      await safeWriteAudit({
        eventType: 'LOGIN_FAILED',
        eventStatus: 'FAILED',
        tenantId: tenantId,
        tenantSlug: 'gaso-admin-platform',
        username,
        reason: 'MISSING_CREDENTIALS_MFA_SETUP'
      })

      return NextResponse.json(
        { ok: false, message: ['User and password are required'] },
        { status: 400 }
      )
    }

    const user = await prisma.gASOCO_Cat_Usuarios.findFirst({
      select: { IdUsuario: true, EmployeeID: true, TenantID: true },
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
        reason: 'INVALID_CREDENTIALS_MFA_SETUP'
      })

      return NextResponse.json(
        { ok: false, message: ['Invalid credentials'] },
        { status: 401 }
      )
    }

    const emp = await withTenantContext(tenantId, async (tx) => {
      const rows = await tx.$queryRaw<Array<{
        Nombre: string | null; Email: string | null
        IdDepartamento: number | null; IdPuesto: number | null
        IdArea: number | null; IdRegion: number | null; IsActive: boolean
      }>>`
        SELECT e.Email, e.IsActive
        FROM HumanCapital.Employees e
        WHERE e.TenantID = CAST(${tenantId} AS uniqueidentifier) AND e.EmployeeID = ${user.EmployeeID}
      `
      return rows[0] ?? null
    })

    if (!emp || !emp.IsActive) {
      await writeAuthAudit({ eventType: 'LOGIN_FAILED', eventStatus: 'FAILED', tenantId, username, userId: user.IdUsuario, reason: 'EMPLOYEE_INACTIVE' })

      return NextResponse.json({ message: ['User or Password is invalid'] }, { status: 401, statusText: 'Unauthorized Access' })
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
    const issuer = 'Gaso-SaaS Admin'
    const accountName = emp.Email ?? username

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
        ${maskEmail(emp.Email)},
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

    await safeWriteAudit({
      eventType: 'MFA_SETUP_STARTED',
      eventStatus: 'SUCCESS',
      tenantId: tenantId,
      tenantSlug: 'gaso-admin-platform',
      username,
      userId: user.IdUsuario,
      email: emp.Email ?? null,
      metadata: {
        setupId,
        factorType: 'TOTP',
        provider: 'GoogleAuthenticator'
      }
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
    console.error('[ADMIN_MFA_SETUP_START_ERROR]', error)

    return NextResponse.json(
      { ok: false, message: ['Server error while starting MFA setup'] },
      { status: 500 }
    )
  }
}
