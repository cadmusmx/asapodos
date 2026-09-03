// apps\main\src\app\api\login\route.ts
// Third-party Imports
import { NextResponse } from 'next/server'

import { authenticator } from '@otplib/preset-default'

// Tools
import {
  prisma,
  getTenantFromHeaders,
  setTenantContext,
  getTotpSecretForLogin,
  markTotpFactorFailedAttempt,
  markTotpFactorUsed,
  validateMfaChallenge,
  markMfaSuccess,
  markMfaFailed,
  deleteMfaChallenge,
  writeAuthAudit,
  getPlatformRole,
  withTenantContext,
  getProfilePhoto
} from '@gaso/shared'

export async function POST(req: Request) {
  try {
    const { id: tenantId, slug: tenantSlug, name: tenantName } = getTenantFromHeaders(req.headers)

    await setTenantContext(tenantId)

    const body = await req.json()

    const username = String(body.username ?? '').trim()
    const password = String(body.password ?? '')
    const challengeId = String(body.challengeId ?? '').trim()
    const mfaCode = String(body.mfaCode ?? '').trim()

    const [tenantStatus] = await prisma.$queryRaw<Array<{ Status: string }>>`
      SELECT Status FROM Security.Tenants WHERE TenantID = CAST(${tenantId} AS uniqueidentifier)
    `

    if (!tenantStatus || (tenantStatus.Status !== 'ACTIVE' && tenantStatus.Status !== 'TRIAL')) {
      await writeAuthAudit({
        eventType: 'LOGIN_FAILED',
        eventStatus: 'FAILED',
        tenantId,
        tenantSlug,
        username,
        reason: 'TENANT_SUSPENDED'
      })

      return NextResponse.json(
        { message: ['Organization is suspended. Contact your administrator.'] },
        { status: 403, statusText: 'Tenant Suspended' }
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
      await writeAuthAudit({
        eventType: 'LOGIN_FAILED',
        eventStatus: 'FAILED',
        tenantId,
        tenantSlug,
        username,
        reason: 'INVALID_CREDENTIALS'
      })

      return NextResponse.json(
        { message: ['User or Password is invalid'] },
        { status: 401, statusText: 'Unauthorized Access' }
      )
    }

    const emp = await withTenantContext(tenantId, async tx => {
      const rows = await tx.$queryRaw<
        Array<{
          Nombre: string | null
          Email: string | null
          IdDepartamento: number | null
          IdPuesto: number | null
          IdArea: number | null
          IdRegion: number | null
          IsActive: boolean
        }>
      >`
        SELECT
          LTRIM(RTRIM(e.FirstName + ' ' + e.LastName)) AS Nombre,
          e.Email,
          e.DepartmentID AS IdDepartamento,
          e.PositionID   AS IdPuesto,
          ed.AreaID      AS IdArea,
          ed.RegionID    AS IdRegion,
          e.IsActive
        FROM HumanCapital.Employees e
        LEFT JOIN HumanCapital.EmployeeData ed ON ed.TenantID = e.TenantID AND ed.EmployeeID = e.EmployeeID
        WHERE e.TenantID = CAST(${tenantId} AS uniqueidentifier) AND e.EmployeeID = ${user.EmployeeID}
      `

      return rows[0] ?? null
    })

    // Gate de empleo (decisión — borra el if para puro-cuenta):
    if (!emp || !emp.IsActive) {
      await writeAuthAudit({
        eventType: 'LOGIN_FAILED',
        eventStatus: 'FAILED',
        tenantId,
        tenantSlug,
        username,
        userId: user.IdUsuario,
        reason: 'EMPLOYEE_INACTIVE'
      })

      return NextResponse.json(
        { message: ['User or Password is invalid'] },
        { status: 401, statusText: 'Unauthorized Access' }
      )
    }

    if (!challengeId || !mfaCode) {
      await writeAuthAudit({
        eventType: 'MFA_FAILED',
        eventStatus: 'FAILED',
        tenantId,
        tenantSlug,
        username,
        userId: user.IdUsuario,
        email: emp.Email ?? null,
        reason: 'MISSING_MFA'
      })

      return NextResponse.json({ message: ['MFA code is required'] }, { status: 401, statusText: 'MFA Required' })
    }

    const challengeResult = await validateMfaChallenge({
      challengeId,
      userId: user.IdUsuario,
      expectedTenantId: tenantId
    })

    if (!challengeResult.valid) {
      const errorMessages: Record<string, string> = {
        NOT_FOUND: 'Invalid MFA challenge',
        EXPIRED: 'MFA challenge expired',
        MAX_ATTEMPTS: 'Too many MFA attempts',
        INVALID_USER: 'Invalid MFA challenge',
        INVALID_TENANT: 'Invalid MFA challenge'
      }

      await writeAuthAudit({
        eventType: 'MFA_FAILED',
        eventStatus: 'FAILED',
        tenantId,
        tenantSlug,
        username,
        userId: user.IdUsuario,
        email: emp.Email ?? null,
        reason: errorMessages[challengeResult.error!] || 'MFA validation failed'
      })

      await markMfaFailed(challengeId)

      return NextResponse.json(
        { message: [errorMessages[challengeResult.error!] || 'MFA validation failed'] },
        { status: 401, statusText: 'Invalid MFA Challenge' }
      )
    }

    const userTotpSecret = await getTotpSecretForLogin({
      tenantId,
      userId: user.IdUsuario
    })

    if (!userTotpSecret) {
      await writeAuthAudit({
        eventType: 'MFA_FAILED',
        eventStatus: 'FAILED',
        tenantId,
        tenantSlug,
        username,
        userId: user.IdUsuario,
        email: emp.Email ?? null,
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
        tenantId,
        userId: user.IdUsuario
      })

      await writeAuthAudit({
        eventType: 'MFA_FAILED',
        eventStatus: 'FAILED',
        tenantId,
        tenantSlug,
        username,
        userId: user.IdUsuario,
        email: emp.Email ?? null,
        reason: 'INVALID_MFA_CODE',
        metadata: {
          attempts: challengeResult.challenge!.attempts + 1,
          maxAttempts: challengeResult.challenge!.maxAttempts
        }
      })

      return NextResponse.json({ message: ['Invalid MFA code'] }, { status: 401, statusText: 'Invalid MFA Code' })
    }

    await markMfaSuccess(challengeId)

    await markTotpFactorUsed({
      tenantId,
      userId: user.IdUsuario
    })

    await writeAuthAudit({
      eventType: 'MFA_SUCCESS',
      eventStatus: 'SUCCESS',
      tenantId,
      tenantSlug,
      username,
      userId: user.IdUsuario,
      email: emp.Email ?? null
    })

    await writeAuthAudit({
      eventType: 'LOGIN_SUCCESS',
      eventStatus: 'SUCCESS',
      tenantId,
      tenantSlug,
      username,
      userId: user.IdUsuario,
      email: emp.Email ?? null
    })

    // Clean up the challenge after successful login
    await deleteMfaChallenge(challengeId)

    const platformRole = await getPlatformRole(user.IdUsuario)

    return NextResponse.json({
      id: user.IdUsuario,
      employeeId: user.EmployeeID,
      name: emp.Nombre ?? '',
      email: emp.Email,
      area: emp.IdArea,
      department: emp.IdDepartamento,
      position: emp.IdPuesto,
      region: emp.IdRegion,
      image: await getProfilePhoto(tenantId, user.EmployeeID),
      tenantId,
      tenantSlug,
      tenantName,
      platformRole
    })
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e ?? 'Unknown error')
    const errorName = e instanceof Error ? e.name : 'UnknownError'

    console.error('[LOGIN_ROUTE_ERROR]', {
      name: errorName,
      message: errorMessage
    })

    return NextResponse.json(
      { message: ['Server error while validating login'] },
      { status: 401, statusText: 'Unauthorized Access' }
    )
  }
}
