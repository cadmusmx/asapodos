// Diff estructural campo-por-campo para datos de auditoría (OldData/NewData).

export type DiffStatus = 'unchanged' | 'modified' | 'added' | 'removed';

export type DiffRow = {
  key: string;
  status: DiffStatus;
  oldValue?: unknown;
  newValue?: unknown;
}

function safeParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

/** Normaliza la entrada (string JSON, objeto, o null/'') a un objeto plano. */
function toObject(data: unknown): Record<string, unknown> {
  if (data == null || data === '') return {};
  const parsed = typeof data === 'string' ? safeParse(data) : data;

  // Si no es un objeto (p.ej. un string suelto o JSON inválido), lo envolvemos
  // bajo una clave sintética para que el diff lo trate como un campo único.
  if (parsed == null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { _raw: parsed ?? String(data) };
  }

  return parsed as Record<string, unknown>;
}

/** Representa un valor para mostrarlo en la tabla del diff. */
export function formatValue(v: unknown): string {
  if (v === null) return 'null';
  if (v === undefined) return '—';
  if (typeof v === 'object') return JSON.stringify(v); // objetos anidados: compactos
  
return String(v);
}

export function diffJson(oldData: unknown, newData: unknown): DiffRow[] {
  const o = toObject(oldData);
  const n = toObject(newData);

  const allKeys = Array.from(new Set([...Object.keys(o), ...Object.keys(n)])).sort();

  return allKeys.map(key => {
    const inOld = key in o;
    const inNew = key in n;
    const oldValue = o[key];
    const newValue = n[key];

    if (inOld && !inNew) return { key, status: 'removed' as const, oldValue };
    if (!inOld && inNew) return { key, status: 'added' as const, newValue };

    const changed = JSON.stringify(oldValue) !== JSON.stringify(newValue);

    return { key, status: changed ? ('modified' as const) : ('unchanged' as const), oldValue, newValue };
  })
}
