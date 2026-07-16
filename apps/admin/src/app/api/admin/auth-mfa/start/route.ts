import { NextResponse } from 'next/server'

import {
  prisma,
  writeAuthAudit,
  getUserTotpSecret,
  createMfaChallenge,
  getPlatformRole,
  setTenantContext
} from '@gaso/shared'

type TenantRow = {
  TenantID: string
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

    const adminTenant = await prisma.$queryRaw<TenantRow[]>`
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
        reason: 'MISSING_CREDENTIALS'
      })

      return NextResponse.json(
        { ok: false, message: ['User and password are required'] },
        { status: 400 }
      )
    }

    const user = await prisma.gASOCO_Cat_Usuarios.findFirst({
      select: {
        IdUsuario: true,
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
        reason: 'INVALID_CREDENTIALS'
      })

      return NextResponse.json(
        { ok: false, message: ['Invalid credentials'] },
        { status: 401 }
      )
    }

    const platformRole = await getPlatformRole(user.IdUsuario)

    if (!platformRole) {
      await safeWriteAudit({
        eventType: 'LOGIN_FAILED',
        eventStatus: 'FAILED',
        tenantId: tenantId,
        tenantSlug: 'gaso-admin-platform',
        username,
        userId: user.IdUsuario,
        email: user.Email ?? null,
        reason: 'NOT_PLATFORM_ADMIN'
      })

      return NextResponse.json(
        { ok: false, message: ['Not authorized as platform admin'] },
        { status: 403 }
      )
    }

    await safeWriteAudit({
      eventType: 'LOGIN_PASSWORD_VALID',
      eventStatus: 'SUCCESS',
      tenantId: tenantId,
      tenantSlug: 'gaso-admin-platform',
      username,
      userId: user.IdUsuario,
      email: user.Email ?? null
    })

    const userTotpSecret = await getUserTotpSecret({
      tenantId: tenantId,
      userId: user.IdUsuario
    })

    if (!userTotpSecret) {
      await safeWriteAudit({
        eventType: 'MFA_SETUP_REQUIRED',
        eventStatus: 'SUCCESS',
        tenantId: tenantId,
        tenantSlug: 'gaso-admin-platform',
        username,
        userId: user.IdUsuario,
        email: user.Email ?? null,
        reason: 'MFA_FACTOR_NOT_CONFIGURED'
      })

      return NextResponse.json({
        ok: true,
        requiresMfa: false,
        requiresMfaSetup: true,
        message: ['MFA setup is required']
      })
    }

    const { challengeId, expiresAt } = await createMfaChallenge({
      tenantId: tenantId,
      tenantSlug: 'gaso-admin-platform',
      tenantName: 'Gaso Admin Platform',
      username,
      userId: user.IdUsuario,
      email: user.Email ?? null
    })

    await safeWriteAudit({
      eventType: 'MFA_CHALLENGE_CREATED',
      eventStatus: 'SUCCESS',
      tenantId: tenantId,
      tenantSlug: 'gaso-admin-platform',
      username,
      userId: user.IdUsuario,
      email: user.Email ?? null,
      metadata: { challengeId }
    })

    return NextResponse.json({
      ok: true,
      requiresMfa: true,
      requiresMfaSetup: false,
      challengeId,
      expiresAt
    })
  } catch (error) {
    console.error('[ADMIN_MFA_START_ERROR]', error)

    return NextResponse.json(
      { ok: false, message: ['Server error'] },
      { status: 500 }
    )
  }
}
