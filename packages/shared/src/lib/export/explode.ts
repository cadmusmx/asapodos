// Desanida un campo 1-a-N (JSON string o array ya parseado) a filas planas,
// repitiendo columnas "clave" del padre (típicamente el Folio). Transversal:
// VM lo usa para piezas/tarimas/documentos; LM para sitios y su detalle.

/** Parsea un valor que puede venir como JSON string, array, o vacío. */
export function parseJsonArray(value: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(value)) return value as Array<Record<string, unknown>>;
  if (typeof value !== 'string' || !value.trim()) return [];

  try {
    const arr = JSON.parse(value);

    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

/**
 * Expande `rows[i][field]` (1-a-N) a una lista plana. Cada fila hija se prefija
 * con las columnas `keys` del padre (ej. { Folio: r.Folio }) para poder unir
 * después en la herramienta de análisis.
 *
 *   explodeJson(regs, 'PiezasMotivo', { Folio: r => r.Folio },
 *     item => ({ Motivo: item.clt, Piezas: item.pzs }))
 */
export function explodeJson<TParent, TChildOut extends Record<string, unknown>>(
  rows: TParent[],
  field: keyof TParent,
  keys: Record<string, (parent: TParent) => unknown>,
  mapChild: (child: Record<string, unknown>, parent: TParent) => TChildOut,
): Array<Record<string, unknown>> {
  const out: Array<Record<string, unknown>> = [];

  for (const parent of rows) {
    const children = parseJsonArray(parent[field]);

    for (const child of children) {
      const keyCols: Record<string, unknown> = {};

      for (const [name, get] of Object.entries(keys)) keyCols[name] = get(parent);

      out.push({ ...keyCols, ...mapChild(child, parent) });
    }
  }

  return out;
}
