/**
 * RBAC · Máscara de permisos CRUD (bitmask)
 *
 * FUENTE ÚNICA del orden de bits. Se define UNA vez aquí y NO se reordena nunca:
 * lo consumen el resolver, los guards, /api/me y —vía copia del contrato— Flutter S3.
 * Reordenar estos bits rompe toda máscara ya almacenada en BD.
 *
 *   R = 1  (Read   / ver)
 *   W = 2  (Write  / crear)
 *   U = 4  (Update / editar)
 *   D = 8  (Delete / eliminar)
 *
 * Invariante de canonicidad: (W | U | D) ⇒ R. No puedes crear/editar/eliminar
 * algo que no puedes ver. Esto deja 9 máscaras válidas de las 16 posibles,
 * espejo EXACTO del CHECK en BD: PermMask IN (0,1,3,5,7,9,11,13,15).
 */

export const PERM = {
  R: 1,
  W: 2,
  U: 4,
  D: 8,
} as const;

export type PermBit = (typeof PERM)[keyof typeof PERM];

/** Sin permisos. */
export const PERM_NONE = 0;

/** Permiso pleno R|W|U|D = 15. */
export const PERM_ALL: number = PERM.R | PERM.W | PERM.U | PERM.D;

/**
 * Las 9 máscaras canónicas. Espejo EXACTO del CHECK de
 * Security.DepartmentViews / Security.UserViews. Si cambias una, cambia el CHECK.
 */
export const CANONICAL_MASKS: readonly number[] = Object.freeze([0, 1, 3, 5, 7, 9, 11, 13, 15]);

/**
 * ¿Es una máscara canónica? Entero en 0..15 y, si tiene W/U/D, también R.
 * Equivale a `CANONICAL_MASKS.includes(mask)` pero por reglas de bits.
 */
export function isCanonical(mask: number): boolean {
  if (!Number.isInteger(mask) || mask < 0 || mask > PERM_ALL) return false;

  const writeUpdateDelete = PERM.W | PERM.U | PERM.D
  if ((mask & writeUpdateDelete) !== 0 && (mask & PERM.R) === 0) return false;

  return true;
}

export const hasRead = (mask: number): boolean => (mask & PERM.R) === PERM.R;
export const hasWrite = (mask: number): boolean => (mask & PERM.W) === PERM.W;
export const hasUpdate = (mask: number): boolean => (mask & PERM.U) === PERM.U;
export const hasDelete = (mask: number): boolean => (mask & PERM.D) === PERM.D;

/**
 * Intersección de máscaras. El resolver la usa como
 * maskEfectiva = userMask & deptCeiling (Modelo 1, fail-closed).
 */
export const intersect = (a: number, b: number): number => a & b;

/**
 * Guardarraíl de delegación (Paso 5): ¿`mask` cabe completa dentro de `ceiling`?
 * Un manager nunca otorga fuera del techo de su departamento.
 */
export const withinCeiling = (mask: number, ceiling: number): boolean => (mask & ceiling) === mask;

/** Representación legible para auditoría/logs, p.ej. 7 -> "R|W|U", 0 -> "-". */
export function describeMask(mask: number): string {
  if (mask === PERM_NONE) return '-';

  const parts: string[] = []
  if (hasRead(mask)) parts.push('R');
  if (hasWrite(mask)) parts.push('W');
  if (hasUpdate(mask)) parts.push('U');
  if (hasDelete(mask)) parts.push('D');

  return parts.join('|');
}
