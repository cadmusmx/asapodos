/**
 * Fuente única de verdad del catálogo de acciones de auditoría.
 *
 * Consumido por:
 *  - src/app/api/auth-mfa/store.ts  → getAuditAction (evento → código)
 *  - src/app/api/audit/route.ts     → KNOWN_ACTIONS (filtro "OTHER")
 *  - la UI del visor                → dropdown (código + etiqueta legible)
 *
 * Al agregar una acción nueva: añadirla aquí y, si nace de un evento de auth,
 * mapear el evento en EVENT_TO_ACTION. Nada más se toca.
 */

export type { AuthAuditEventType } from '../mfa/types'

// Códigos tal como se persisten en Audit.TransactionLog.Action (NVARCHAR(10)).
// Contempla todos los origenes
export const AUDIT_ACTIONS = {
  PWD_OK: 'PWD_OK',
  MFA_START: 'MFA_START',
  MFA_SETUP: 'MFA_SETUP',
  MFA_OK: 'MFA_OK',
  MFA_FAIL: 'MFA_FAIL',
  LOGIN_OK: 'LOGIN_OK',
  LOGIN_FAIL: 'LOGIN_FAIL',
  XTENANT: 'XTENANT',
  NO_SESS: 'NO_SESS',
  MFA_RESET: 'MFA_RESET',
  INSERT: 'INSERT',
  UPDATE: 'UPDATE',
  READ: 'READ',
  PERM_CHG: 'PERM_CHG',
  TEN_CR: 'TEN_CR',
  TEN_UP: 'TEN_UP',
  TEN_SUSP: 'TEN_SUSP',
  TEN_ACT: 'TEN_ACT',
  TEN_DEA: 'TEN_DEA',
  PLT_CR: 'PLT_CR',
  PLT_RM: 'PLT_RM',
  CHPERMSS: 'CHPERMSS',
  CATALOG: 'CATALOG',
} as const;

export type AuditActionCode = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

// Etiquetas legibles para la UI, todos los eventos (dropdown y tabla).
export const AUDIT_ACTION_LABELS: Record<AuditActionCode, string> = {
  PWD_OK: 'Contraseña válida',
  MFA_START: 'Reto MFA iniciado',
  MFA_SETUP: 'Alta de MFA',
  MFA_OK: 'MFA exitoso',
  MFA_FAIL: 'MFA fallido',
  LOGIN_OK: 'Login exitoso',
  LOGIN_FAIL: 'Login fallido',
  XTENANT: 'Acceso cross-tenant',
  NO_SESS: 'Acceso sin sesión',
  MFA_RESET: 'MFA restablecido',
  INSERT: 'Inserción',
  UPDATE: 'Actualización',
  READ: 'Consulta',
  PERM_CHG: 'Cambio de permisos',
  TEN_CR: 'Tenant creado',
  TEN_UP: 'Tenant actualizado',
  TEN_SUSP: 'Tenant suspendido',
  TEN_ACT: 'Tenant activado',
  TEN_DEA: 'Tenant desactivado',
  PLT_CR: 'Rol de plataforma asignado',
  PLT_RM: 'Rol de plataforma removido',
  CHPERMSS: 'Cambio de permisos via preset',
  CATALOG: 'Actualización de catálogos',
} as const;

// Lista de códigos conocidos. La API la usa para el filtro "OTHER" (NOT IN).
export const KNOWN_ACTIONS: AuditActionCode[] = Object.values(AUDIT_ACTIONS);

// Centinela para el filtro "otras acciones no catalogadas".
export const ACTION_OTHER = '__OTHER__' as const;

// Mapeo de eventos de auth (AuthAuditEventType) → código de acción (solo eventos WEB).
export const EVENT_TO_ACTION: Record<string, AuditActionCode> = {
  LOGIN_PASSWORD_VALID: 'PWD_OK',
  MFA_CHALLENGE_CREATED: 'MFA_START',
  MFA_SETUP_REQUIRED: 'MFA_SETUP',
  MFA_SETUP_STARTED: 'MFA_SETUP',
  MFA_SUCCESS: 'MFA_OK',
  MFA_FAILED: 'MFA_FAIL',
  LOGIN_SUCCESS: 'LOGIN_OK',
  LOGIN_FAILED: 'LOGIN_FAIL',
  MFA_RESET: 'MFA_RESET',
  PERM_CHG: 'PERM_CHG',
  CHPERMSS: 'CHPERMSS',
};

// Catálogo de orígenes de evento (espejo de la tabla Audit.Cat_OriginTL).
// NOTA: es un mirror de datos de BD. Si Cat_OriginTL crece, migrar a un
// endpoint que lea la tabla en vez de este hardcode.
export const AUDIT_ORIGINS = [
  { id: 1, nombre: 'DB' },
  { id: 2, nombre: 'WEB' },
  { id: 3, nombre: 'APP' }
] as const;

// Centinela para filtrar eventos sin origen (IdOrigin IS NULL).
// String (no número) para no colisionar nunca con un Id real del catálogo.
export const ORIGIN_NONE = '__NONE__' as const;
