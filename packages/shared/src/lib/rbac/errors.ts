/**
 * El core (requirePermission) LANZA estos errores; no sabe de HTTP.
 * El HOF de ruta (withPermission) los traduce: UnauthorizedError -> 401,
 * ForbiddenError -> 403. Calca el estilo de TenantError (código string + name).
 */

export type UnauthorizedCode = 'UNAUTHENTICATED' | 'MISSING_TENANT';
export type ForbiddenCode = 'PERMISSION_DENIED' | 'TENANT_MISMATCH' | 'PLAN_RESTRICTED';
export type ValidationCode = 'INVALID_MASK' | 'UNKNOWN_VIEW' | 'PROTECTED_VIEW';

/** Falta sesión o falta contexto de tenant. El HOF lo mapea a 401. */
export class UnauthorizedError extends Error {
  constructor(
    message = 'No autenticado',
    public readonly code: UnauthorizedCode = 'UNAUTHENTICATED'
  ) {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

/**
 * Hay sesión pero no autorización: permiso insuficiente sobre la vista,
 * o el tenant de la sesión no coincide con el del request. El HOF lo mapea a 403.
 * `details` es solo para log/auditoría server-side; NO se devuelve al cliente.
 */
export class ForbiddenError extends Error {
  constructor(
    message = 'Permiso denegado',
    public readonly code: ForbiddenCode = 'PERMISSION_DENIED',
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ForbiddenError';
  }
}


/** Request mal formado (no es falta de permiso). El HOF lo mapea a 400. */
export class ValidationError extends Error {
  constructor(
    message = 'Solicitud inválida',
    public readonly code: ValidationCode = 'INVALID_MASK',
    public readonly details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'ValidationError'
  }
}
