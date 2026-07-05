// Helpers PUROS de presentación de máscaras para la UI de permisos (sin React).
// La autoridad de permisos es el servidor; esto solo decide cómo pintar cada bit.

import { PERM } from '@gaso/shared';

export type BitKey = 'R' | 'W' | 'U' | 'D';

export const BIT_ORDER: BitKey[] = ['R', 'W', 'U', 'D'];

export const BIT_VALUE: Record<BitKey, number> = {
  R: PERM.R,
  W: PERM.W,
  U: PERM.U,
  D: PERM.D
};

export const BIT_LABEL: Record<BitKey, string> = {
  R: 'Ver',
  W: 'Crear',
  U: 'Editar',
  D: 'Eliminar'
};

/** Estado visual de un bit para una vista dada. */
export type BitState =
  | 'public' // lo tiene por vista pública; activo y no quitable (candado)
  | 'assigned' // asignado manualmente (UserViews); activo
  | 'assignable' // dentro del techo, hoy no lo tiene; se puede asignar
  | 'out_of_ceiling'; // el techo del depto no lo permite

export interface ViewMasks {
  currentMask: number;
  ceilingMask: number;
  publicMask: number;
}

const has = (mask: number, bit: number) => (mask & bit) === bit;

/** Estado de un bit concreto, según las tres máscaras. */
export function bitState(bit: BitKey, masks: ViewMasks): BitState {
  const b = BIT_VALUE[bit];

  if (!has(masks.ceilingMask, b)) return 'out_of_ceiling';
  if (has(masks.publicMask, b)) return 'public';
  if (has(masks.currentMask, b)) return 'assigned';

  return 'assignable';
}

/**
 * Bits a MOSTRAR para una vista (se ocultan los fuera de techo).
 * Devuelve cada bit con su estado, en orden R,W,U,D.
 */
export function visibleBits(masks: ViewMasks): Array<{ bit: BitKey; state: BitState }> {
  return BIT_ORDER.map(bit => ({ bit, state: bitState(bit, masks) })).filter(x => x.state !== 'out_of_ceiling');
}

/** ¿La vista tiene algún permiso efectivo (público o asignado)? Para el resumen. */
export function viewHasAccess(masks: ViewMasks): boolean {
  return (masks.currentMask | masks.publicMask) !== 0;
}

/** Máscara efectiva (piso público OR asignado) — informativa para la UI. */
export function effectiveMask(masks: ViewMasks): number {
  return masks.currentMask | masks.publicMask;
}

/** ¿Un bit es editable? (dentro del techo y NO público). Los públicos van bloqueados-on. */
export function isBitEditable(bit: BitKey, masks: ViewMasks): boolean {
  const b = BIT_VALUE[bit];

  if ((masks.ceilingMask & b) !== b) return false; // fuera de techo
  if ((masks.publicMask & b) === b) return false; // público -> bloqueado

  return true;
}

/**
 * Alterna un bit sobre una máscara CRUDA (UserViews) manteniendo:
 *   - Canonicidad: W/U/D ⇒ R. Encender W/U/D enciende R; apagar R apaga W/U/D.
 *   - Techo: nunca enciende bits fuera de ceilingMask.
 *   - Público: no altera bits públicos (se ignora el toggle sobre ellos).
 * Devuelve la nueva máscara cruda, ya canónica.
 */
export function toggleBit(bit: BitKey, currentRaw: number, masks: ViewMasks): number {
  if (!isBitEditable(bit, masks)) return currentRaw; // público o fuera de techo: sin cambio

  const b = BIT_VALUE[bit];
  const isOn = (currentRaw & b) === b;

  let next: number;

  if (isOn) {
    // Apagar. Si apagamos R, se caen W/U/D (canonicidad).
    if (bit === 'R') {
      next = 0;
    } else {
      next = currentRaw & ~b;
    }
  } else {
    // Encender. Si encendemos W/U/D, aseguramos R.
    next = currentRaw | b;

    if (bit !== 'R') next |= PERM.R;
  }

  // Nunca exceder el techo (defensa; los toggles ya respetan editabilidad).
  next &= masks.ceilingMask;

  return next;
}

/** ¿La máscara cruda editada difiere de la original? (para mostrar/ocultar Guardar). */
export function isDirty(originalRaw: number, editedRaw: number): boolean {
  return originalRaw !== editedRaw;
}

/** Vista cuya escritura está prohibida por el motor (regla b: PROTECTED_VIEW). */
export const PROTECTED_VIEW_CODES = new Set<string>(['permissions_access']);

export function isProtectedView(viewCode: string): boolean {
  return PROTECTED_VIEW_CODES.has(viewCode);
}

/** Un cambio para el endpoint batch. */
export interface ViewChange {
  viewCode: string;
  mask: number;
}

/**
 * Recolecta los cambios pendientes: por cada viewCode cuya máscara editada
 * difiere de la original. Excluye vistas protegidas (no se envían nunca).
 * `originals` y `edited` son mapas viewCode -> máscara cruda.
 */
export function collectChanges(
  originals: Record<string, number>,
  edited: Record<string, number>
): ViewChange[] {
  const changes: ViewChange[] = [];

  for (const viewCode of Object.keys(edited)) {
    if (isProtectedView(viewCode)) continue;

    const original = originals[viewCode] ?? 0;
    const current = edited[viewCode] ?? 0;

    if (original !== current) changes.push({ viewCode, mask: current });
  }

  return changes;
}

/** ¿Hay algún cambio pendiente en todo el conjunto? (dirty GLOBAL). */
export function hasPendingChanges(
  originals: Record<string, number>,
  edited: Record<string, number>
): boolean {
  return collectChanges(originals, edited).length > 0;
}
