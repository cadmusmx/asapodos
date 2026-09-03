// Next Imports
import { NextResponse } from 'next/server'

// Tools
import {
  prisma,
  getTenantFromHeaders,
  setTenantContext,
  ID_ORIGIN_WEB,
  getUserTotpSecret,
  createMfaChallenge,
  writeAuthAudit
} from '@gaso/shared'

export async function POST(req: Request) {
  try {
    const { id: tenantId, slug: tenantSlug, name: tenantName } = getTenantFromHeaders(req.headers)

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
        reason: 'MISSING_CREDENTIALS',
        idOrigin
      })

      return NextResponse.json({ ok: false, message: ['User and password are required'] }, { status: 400 })
    }

    const user = await prisma.gASOCO_Cat_Usuarios.findFirst({
      select: {
        IdUsuario: true,
        EmployeeID: true,
        Usuario: true,
        TenantID: true
      },
      where: {
        Usuario: { equals: username },
        Password: { equals: password },
        Estatus: { equals: 'A' }
      }
    })

    if (!user || !user.IdUsuario) {
      await writeAuthAudit({
        eventType: 'LOGIN_FAILED',
        eventStatus: 'FAILED',
        tenantId,
        tenantSlug,
        username,
        reason: 'INVALID_CREDENTIALS',
        idOrigin
      })

      return NextResponse.json({ ok: false, message: ['Invalid credentials'] }, { status: 401 })
    }

    // emp sobre el MISMO pool con contexto ya fijado por setTenantContext (no abrir otra tx)
    const empRows = await prisma.$queryRaw<Array<{ Email: string | null; IsActive: boolean }>>`
      SELECT e.Email, e.IsActive
      FROM HumanCapital.Employees e
      WHERE e.TenantID = CAST(${tenantId} AS uniqueidentifier) AND e.EmployeeID = ${user.EmployeeID}
    `

    const emp = empRows[0] ?? null

    if (!emp || !emp.IsActive) {
      await writeAuthAudit({
        eventType: 'LOGIN_FAILED',
        eventStatus: 'FAILED',
        tenantId,
        username,
        userId: user.IdUsuario,
        reason: 'EMPLOYEE_INACTIVE'
      })

      return NextResponse.json(
        { message: ['User or Password is invalid'] },
        { status: 401, statusText: 'Unauthorized Access' }
      )
    }

    await writeAuthAudit({
      eventType: 'LOGIN_PASSWORD_VALID',
      eventStatus: 'SUCCESS',
      tenantId,
      tenantSlug,
      username,
      userId: user.IdUsuario,
      email: emp.Email ?? null,
      idOrigin
    })

    const userTotpSecret = await getUserTotpSecret({
      tenantId,
      userId: user.IdUsuario
    })

    if (!userTotpSecret) {
      await writeAuthAudit({
        eventType: 'MFA_SETUP_REQUIRED',
        eventStatus: 'SUCCESS',
        tenantId,
        tenantSlug,
        username,
        userId: user.IdUsuario,
        email: emp.Email ?? null,
        reason: 'MFA_FACTOR_NOT_CONFIGURED',
        metadata: { factorType: 'TOTP' },
        idOrigin
      })

      return NextResponse.json({
        ok: true,
        requiresMfa: false,
        requiresMfaSetup: true,
        reason: 'MFA_SETUP_REQUIRED',
        factorType: 'TOTP'
      })
    }

    const { challengeId, expiresAt } = await createMfaChallenge({
      tenantId,
      tenantSlug,
      tenantName,
      username,
      userId: user.IdUsuario,
      email: emp.Email ?? null
    })

    await writeAuthAudit({
      eventType: 'MFA_CHALLENGE_CREATED',
      eventStatus: 'SUCCESS',
      tenantId,
      tenantSlug,
      username,
      userId: user.IdUsuario,
      email: emp.Email ?? null,
      metadata: { challengeId, factorType: 'TOTP' },
      idOrigin
    })

    return NextResponse.json({
      ok: true,
      requiresMfa: true,
      requiresMfaSetup: false,
      challengeId,
      expiresAt,
      factorType: 'TOTP'
    })
  } catch (error) {
    console.error(
      '[AUTH_MFA_START_ERROR]',
      error instanceof Error ? { message: error.message, stack: error.stack } : error
    )

    return NextResponse.json({ ok: false, message: ['Server error'] }, { status: 500 })
  }
}
