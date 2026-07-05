export type MfaChallengeStatus = 'PENDING' | 'VERIFIED' | 'FAILED' | 'EXPIRED';

export type MfaChallenge = {
  challengeId: string
  tenantId: string
  tenantSlug: string
  tenantName: string
  username: string
  userId: number
  email: string | null
  status: MfaChallengeStatus
  attempts: number
  maxAttempts: number
  expiresAt: number
  createdAt: number
}

export type AuthAuditEventType =
  | 'LOGIN_PASSWORD_VALID'
  | 'MFA_CHALLENGE_CREATED'
  | 'MFA_SETUP_REQUIRED'
  | 'MFA_SETUP_STARTED'
  | 'MFA_SUCCESS'
  | 'MFA_FAILED'
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'MFA_RESET'

export type AuthAuditEventStatus = 'SUCCESS' | 'FAILED'

export type AuthAuditEvent = {
  eventType: AuthAuditEventType
  eventStatus: AuthAuditEventStatus
  tenantId: string
  tenantSlug?: string | null
  username?: string | null
  userId?: number | null
  email?: string | null
  reason?: string | null
  metadata?: Record<string, unknown>
  createdAt?: string
  idOrigin?: number
}
