// Filtros del export de LM (y su countOnly). Fuente única para el WHERE del universo
// a exportar y su conteo autoritativo.
//
// Nota de divergencia vs VM: LM es SP-driven. El /search usa usp_LM_GetList (el WHERE
// vive DENTRO del SP), así que estos predicados ESPEJAN los del SP y deben mantenerse
// en sync con él (Fecha, IdUsuario, IdXdock, RE, IdCarrier). No se comparte con search.

import { Prisma } from '@prisma/client'

export interface LMFilters {
  re: boolean | null // null = ambos (eje recepción/entrega)
  fechaInicio: Date | null
  fechaFin: Date | null
  idUsuario?: number
  idXdock?: number
  idCarrier?: number
}

function toDate(v: unknown): Date | null {
  if (typeof v !== 'string' || !v.trim()) return null

  const d = new Date(v.trim())

  return isNaN(d.getTime()) ? null : d
}

const toInt = (v: unknown): number | undefined => {
  const n = Number(v)

  return Number.isInteger(n) && n > 0 ? n : undefined
}

// re tri-estado: ausente/vacío = ambos; 'true'/'1' o 'false'/'0' = filtra.
function toBoolOrNull(v: unknown): boolean | null {
  if (v === undefined || v === null || v === '') return null

  return v === true || v === 'true' || v === '1'
}

/** Normaliza filtros desde un origen indistinto (searchParams de GET o body de POST). */
export function parseLMFilters(get: (key: string) => unknown): LMFilters {
  return {
    re: toBoolOrNull(get('re')),
    fechaInicio: toDate(get('fechaInicio')),
    fechaFin: toDate(get('fechaFin')),
    idUsuario: toInt(get('idUsuario')),
    idXdock: toInt(get('idXdock')),
    idCarrier: toInt(get('idCarrier')),
  }
}

/** Adaptador: lee filtros de URLSearchParams (ruta GET: export/count). */
export const fromSearchParams = (sp: URLSearchParams) => (key: string): unknown => sp.get(key)

/** Adaptador: lee filtros de un body ya parseado (por si a futuro se comparte). */
export const fromBody = (body: Record<string, unknown>) => (key: string): unknown => body[key]

/**
 * WHERE parametrizado sobre `lm` (GASOAL_LM). Espeja los predicados de usp_LM_GetList.
 * TenantID explícito además de RLS. `re` nunca interpolado.
 */
export function buildLMWhere(tenantId: string, f: LMFilters): Prisma.Sql {
  const conds: Prisma.Sql[] = [Prisma.sql`lm.TenantID = ${tenantId}`]

  if (f.re !== null) conds.push(Prisma.sql`lm.RE = ${f.re ? 1 : 0}`)
  if (f.fechaInicio) conds.push(Prisma.sql`lm.Fecha >= ${f.fechaInicio}`)
  if (f.fechaFin) conds.push(Prisma.sql`lm.Fecha <= ${f.fechaFin}`)
  if (f.idUsuario != null) conds.push(Prisma.sql`lm.IdUsuario = ${f.idUsuario}`)
  if (f.idXdock != null) conds.push(Prisma.sql`lm.IdXdock = ${f.idXdock}`)
  if (f.idCarrier != null) conds.push(Prisma.sql`lm.IdCarrier = ${f.idCarrier}`)

  return Prisma.join(conds, ' AND ')
}

/** COUNT(*) puede volver bigint -> Number seguro (NULL -> 0). */
export function toNumber(v: number | bigint | null | undefined): number {
  if (v == null) return 0

  return typeof v === 'bigint' ? Number(v) : v
}