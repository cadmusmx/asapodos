// apps\main\src\app\api\mobile\login\route.ts
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
  signMobileToken,
  withTenantContext
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
      select: { IdUsuario: true, EmployeeID: true, TenantID: true },
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

    const emp = await withTenantContext(tenantId, async (tx) => {
      const rows = await tx.$queryRaw<Array<{
        Nombre: string | null; Email: string | null
        IdDepartamento: number | null; IdPuesto: number | null
        IdArea: number | null; IdRegion: number | null; IsActive: boolean
      }>>`
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
      await writeAuthAudit({ eventType: 'LOGIN_FAILED', eventStatus: 'FAILED', tenantId, tenantSlug, username, userId: user.IdUsuario, reason: 'EMPLOYEE_INACTIVE' })

      return NextResponse.json({ message: ['User or Password is invalid'] }, { status: 401, statusText: 'Unauthorized Access' })
    }

    if (!challengeId || !mfaCode) {
      await writeAuthAudit({
        eventType: 'MFA_FAILED', eventStatus: 'FAILED',
        tenantId, tenantSlug, username, userId: user.IdUsuario, email: emp.Email ?? null,
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
        tenantId, tenantSlug, username, userId: user.IdUsuario, email: emp.Email ?? null,
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
        tenantId, tenantSlug, username, userId: user.IdUsuario, email: emp.Email ?? null,
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
        tenantId, tenantSlug, username, userId: user.IdUsuario, email: emp.Email ?? null,
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
      tenantId, tenantSlug, username, userId: user.IdUsuario, email: emp.Email ?? null, idOrigin
    })
    await writeAuthAudit({
      eventType: 'LOGIN_SUCCESS', eventStatus: 'SUCCESS',
      tenantId, tenantSlug, username, userId: user.IdUsuario, email: emp.Email ?? null, idOrigin
    })

    const { accessToken, expiresIn } = await signMobileToken({
      sub: String(user.IdUsuario),
      tenantId,
      employeeId: user.EmployeeID,
      name: emp.Nombre ?? null,
      email: emp.Email ?? null,
    })

    return NextResponse.json({
      id: user.IdUsuario,
      name: emp.Nombre,
      email: emp.Email,
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
