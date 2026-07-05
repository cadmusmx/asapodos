import { prisma } from '../prisma'
import { writeTransactionLog, ID_ORIGIN_WEB } from '../audit/transaction-log'

import type { MfaChallenge, MfaChallengeStatus, AuthAuditEvent, AuthAuditEventType } from './types'

export type { MfaChallenge, MfaChallengeStatus, AuthAuditEvent, AuthAuditEventType }

const CHALLENGE_TTL_MS = 5 * 60 * 1000 // 5 minutes
const MAX_ATTEMPTS = 5

export function generateChallengeId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
}

export async function createMfaChallenge(params: {
  tenantId: string
  tenantSlug: string
  tenantName: string
  username: string
  userId: number
  email: string | null
}): Promise<{ challengeId: string; expiresAt: number }> {
  const challengeId = generateChallengeId()
  const expiresAt = Date.now() + CHALLENGE_TTL_MS

  const challenge: MfaChallenge = {
    challengeId,
    tenantId: params.tenantId,
    tenantSlug: params.tenantSlug,
    tenantName: params.tenantName,
    username: params.username,
    userId: params.userId,
    email: params.email,
    status: 'PENDING',
    attempts: 0,
    maxAttempts: MAX_ATTEMPTS,
    expiresAt,
    createdAt: Date.now()
  }

  // Store in database for cross-app sharing
  await prisma.$executeRaw`
    DELETE FROM Security.MfaChallenges
    WHERE UserId = ${params.userId} AND TenantId = CAST(${params.tenantId} AS uniqueidentifier)
  `

  await prisma.$executeRaw`
    INSERT INTO Security.MfaChallenges (
      ChallengeId, TenantId, TenantSlug, TenantName,
      Username, UserId, Email, Status,
      Attempts, MaxAttempts, ExpiresAt, CreatedAt
    ) VALUES (
      ${challengeId},
      CAST(${params.tenantId} AS uniqueidentifier),
      ${params.tenantSlug},
      ${params.tenantName},
      ${params.username},
      ${params.userId},
      ${params.email ?? null},
      ${challenge.status},
      ${challenge.attempts},
      ${challenge.maxAttempts},
      DATEADD(second, ${CHALLENGE_TTL_MS / 1000}, SYSUTCDATETIME()),
      SYSUTCDATETIME()
    )
  `

  return { challengeId, expiresAt }
}

export async function getMfaChallenge(params: {
  challengeId: string
  userId?: number
}): Promise<MfaChallenge | null> {
  try {
    const query = params.userId
      ? prisma.$queryRaw<Array<{
        ChallengeId: string
        TenantId: string
        TenantSlug: string
        TenantName: string
        Username: string
        UserId: number
        Email: string | null
        Status: string
        Attempts: number
        MaxAttempts: number
        ExpiresAt: Date
        CreatedAt: Date
      }>>`
          SELECT TOP 1 * FROM Security.MfaChallenges
          WHERE ChallengeId = ${params.challengeId} AND UserId = ${params.userId}
        `
      : prisma.$queryRaw<Array<{
        ChallengeId: string
        TenantId: string
        TenantSlug: string
        TenantName: string
        Username: string
        UserId: number
        Email: string | null
        Status: string
        Attempts: number
        MaxAttempts: number
        ExpiresAt: Date
        CreatedAt: Date
      }>>`
          SELECT TOP 1 * FROM Security.MfaChallenges
          WHERE ChallengeId = ${params.challengeId}
        `

    const rows = await query

    if (!rows[0]) return null

    const row = rows[0]

    return {
      challengeId: row.ChallengeId,
      tenantId: row.TenantId,
      tenantSlug: row.TenantSlug,
      tenantName: row.TenantName,
      username: row.Username,
      userId: row.UserId,
      email: row.Email,
      status: row.Status as MfaChallengeStatus,
      attempts: row.Attempts,
      maxAttempts: row.MaxAttempts,
      expiresAt: row.ExpiresAt.getTime(),
      createdAt: row.CreatedAt.getTime()
    }
  } catch {
    return null
  }
}

export async function updateMfaChallenge(params: {
  challengeId: string
  status?: MfaChallengeStatus
  attempts?: number
}): Promise<void> {
  const setClauses: string[] = []
  const paramValues: (string | number)[] = []
  let paramIndex = 1

  if (params.status !== undefined) {
    paramValues.push(params.status)
    setClauses.push(`Status = @p${paramIndex++}`)
  }

  if (params.attempts !== undefined) {
    paramValues.push(params.attempts)
    setClauses.push(`Attempts = @p${paramIndex++}`)
  }

  if (setClauses.length === 0) return

  paramValues.push(params.challengeId)

  await prisma.$executeRawUnsafe(
    `UPDATE Security.MfaChallenges SET ${setClauses.join(', ')} WHERE ChallengeId = @p${paramIndex}`,
    ...paramValues
  )
}

export async function deleteMfaChallenge(challengeId: string): Promise<void> {
  await prisma.$executeRaw`
    DELETE FROM Security.MfaChallenges WHERE ChallengeId = ${challengeId}
  `
}

export async function validateMfaChallenge(params: {
  challengeId: string
  userId: number
  expectedTenantId: string
}): Promise<{
  valid: boolean
  error?: 'NOT_FOUND' | 'EXPIRED' | 'MAX_ATTEMPTS' | 'INVALID_USER' | 'INVALID_TENANT'
  challenge?: MfaChallenge
}> {
  const challenge = await getMfaChallenge({
    challengeId: params.challengeId,
    userId: params.userId
  })

  if (!challenge) {
    return { valid: false, error: 'NOT_FOUND' }
  }

  if (challenge.userId !== params.userId) {
    return { valid: false, error: 'INVALID_USER' }
  }

  // SQL Server devuelve uniqueidentifier en MAYÚSCULAS; el tenantId de headers/JWT
  // viaja en minúsculas. Comparar normalizado para evitar falsos INVALID_TENANT.
  if (
    challenge.tenantId.toLowerCase() !== params.expectedTenantId.toLowerCase() &&
    params.expectedTenantId !== 'PLATFORM'
  ) {
    return { valid: false, error: 'INVALID_TENANT' }
  }

  if (challenge.status === 'EXPIRED' || Date.now() > challenge.expiresAt) {
    await updateMfaChallenge({ challengeId: params.challengeId, status: 'EXPIRED' })
    return { valid: false, error: 'EXPIRED' }
  }

  if (challenge.status === 'FAILED' || challenge.attempts >= challenge.maxAttempts) {
    return { valid: false, error: 'MAX_ATTEMPTS' }
  }

  if (challenge.status === 'VERIFIED') {
    return { valid: true, challenge }
  }

  return { valid: true, challenge }
}

export async function markMfaSuccess(challengeId: string): Promise<void> {
  await updateMfaChallenge({ challengeId, status: 'VERIFIED', attempts: 0 })
}

export async function markMfaFailed(challengeId: string): Promise<void> {
  const challenge = await getMfaChallenge({ challengeId })

  if (!challenge) return

  const newAttempts = challenge.attempts + 1
  const status = newAttempts >= challenge.maxAttempts ? 'FAILED' : 'PENDING'

  await updateMfaChallenge({ challengeId, status, attempts: newAttempts })
}

export async function getDevTotpSecret() {
  const secret = process.env.MFA_TOTP_SECRET

  if (!secret) {
    throw new Error('MFA_TOTP_SECRET is not configured')
  }

  return secret
}

export async function getUserTotpSecret(params: { tenantId: string; userId: number }) {
  const rows = await prisma.$queryRaw<Array<{ SecretEncrypted: string | null }>>`
    SELECT TOP 1
      SecretEncrypted
    FROM Security.UserMfaFactors
    WHERE TenantID = CAST(${params.tenantId} AS uniqueidentifier)
      AND IdUsuario = ${params.userId}
      AND FactorType = 'TOTP'
      AND IsEnabled = 1
      AND IsVerified = 1
    ORDER BY CreatedAt DESC
  `

  const secret = rows[0]?.SecretEncrypted?.trim()

  if (!secret) {
    return null
  }

  return secret
}

export async function getTotpSecretForLogin(params: { tenantId: string; userId: number }) {
  const secretFromDb = await getUserTotpSecret({
    tenantId: params.tenantId,
    userId: params.userId
  })

  if (secretFromDb) {
    return secretFromDb
  }

  if (process.env.NODE_ENV !== 'production') {
    return getDevTotpSecret()
  }

  return null
}

export async function markTotpFactorUsed(params: { tenantId: string; userId: number }) {
  await prisma.$executeRaw`
    UPDATE Security.UserMfaFactors
    SET
      LastUsedAt = SYSUTCDATETIME(),
      FailedAttempts = 0,
      LastFailedAt = NULL,
      UpdatedAt = SYSUTCDATETIME(),
      UpdatedBy = 'AUTH_MFA_LOGIN'
    WHERE TenantID = CAST(${params.tenantId} AS uniqueidentifier)
      AND IdUsuario = ${params.userId}
      AND FactorType = 'TOTP'
      AND IsEnabled = 1
      AND IsVerified = 1
  `
}

export async function markTotpFactorFailedAttempt(params: { tenantId: string; userId: number }) {
  await prisma.$executeRaw`
    UPDATE Security.UserMfaFactors
    SET
      FailedAttempts = ISNULL(FailedAttempts, 0) + 1,
      LastFailedAt = SYSUTCDATETIME(),
      UpdatedAt = SYSUTCDATETIME(),
      UpdatedBy = 'AUTH_MFA_LOGIN'
    WHERE TenantID = CAST(${params.tenantId} AS uniqueidentifier)
      AND IdUsuario = ${params.userId}
      AND FactorType = 'TOTP'
      AND IsEnabled = 1
      AND IsVerified = 1
  `
}

function getAuditAction(eventType: AuthAuditEventType): string {
  const actionByEvent: Record<AuthAuditEventType, string> = {
    LOGIN_PASSWORD_VALID: 'PWD_OK',
    MFA_CHALLENGE_CREATED: 'MFA_START',
    MFA_SETUP_REQUIRED: 'MFA_SETUP',
    MFA_SETUP_STARTED: 'MFA_SETUP',
    MFA_SUCCESS: 'MFA_OK',
    MFA_FAILED: 'MFA_FAIL',
    MFA_RESET: 'MFA_RESET',
    LOGIN_SUCCESS: 'LOGIN_OK',
    LOGIN_FAILED: 'LOGIN_FAIL'
  }

  return actionByEvent[eventType]
}

export async function writeAuthAudit(event: AuthAuditEvent) {
  const createdAt = event.createdAt ?? new Date().toISOString()
  const action = getAuditAction(event.eventType)

  await writeTransactionLog({
    tenantId: event.tenantId,
    tableName: 'Auth.Login',
    action,
    userId: event.userId ?? null,
    appUser: event.email ?? event.username ?? 'system',
    idOrigin: event.idOrigin ?? ID_ORIGIN_WEB,
    newData: {
      eventType: event.eventType,
      eventStatus: event.eventStatus,
      legacyUserId: event.userId ?? null,
      username: event.username ?? null,
      email: event.email ?? null,
      tenantSlug: event.tenantSlug ?? null,
      reason: event.reason ?? null,
      metadata: event.metadata ?? null,
      source: 'GASOCO_Cat_Usuarios'
    }
  })
}
