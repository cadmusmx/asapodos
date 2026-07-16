// Emisión de grants para el apply. Regla de emisión REFINADA:
//   emitir una vista SOLO si tiene algún bit POR ENCIMA del piso público:
//     (working & ~publicMask) !== 0
//
// Esto descarta:
//    - residuos solo-públicos (p.ej. R público que quedó tras encender/apagar W),
//    - vistas sin tocar (working 0).
//
// El VALOR emitido es `working` tal cual (ya canónico):
//    el grant carga R aunque R sea público, porque el grant DEBE ser canónico.
//    `& ~public` decide SI se emite, nunca QUÉ valor.

import { isProtectedView } from '../mask-ui';
import type { DepartmentView, PresetGrant } from './types';

export function collectGrants(
  workingMasks: Record<string, number>,
  views: DepartmentView[]
): PresetGrant[] {
  const grants: PresetGrant[] = [];

  for (const v of views) {
    if (isProtectedView(v.viewCode)) continue; // permissions_access nunca se emite (defensa)

    const working = workingMasks[v.viewCode] ?? 0;

    // ~publicMask es NOT de 32 bits (negativo), pero AND nunca AGREGA bits:
    // el resultado ⊆ working ⊆ 0..15, así que el dominio de 4 bits se respeta.
    if ((working & ~v.publicMask) !== 0) {
      grants.push({ viewCode: v.viewCode, permMask: working });
    }
  }

  return grants;
}

/** ¿Hay al menos un grant emitible? Habilita previsualizar/confirmar. */
export function hasEmittableGrants(
  workingMasks: Record<string, number>,
  views: DepartmentView[]
): boolean {
  return collectGrants(workingMasks, views).length > 0;
}
