// Filtros compartidos por /search, /export (y su count).
// Mismo WHERE -> mismas cifras en la tabla, el conteo del modal y el archivo exportado.
// Calca la forma de app/api/fleets/vehicles/_shared.ts.

import { Prisma } from '@prisma/client'

export interface VMFilters {
  es: boolean
  fechaInicio: Date | null
  fechaFin: Date | null
  idUsuario?: number
  proyecto?: number
  tipoMaterial?: number
  almacen?: number
  carrier?: number
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

/**
 * Normaliza filtros desde un origen indistinto (body de POST o searchParams de GET).
 * `get(key)` devuelve el valor crudo `es` default false (salidas), igual que search.
 */
export function parseVMFilters(get: (key: string) => unknown): VMFilters {
  const esRaw = get('es')

  return {
    es: esRaw === true || esRaw === 'true',
    fechaInicio: toDate(get('fechaInicio')),
    fechaFin: toDate(get('fechaFin')),
    idUsuario: toInt(get('idUsuario')),
    proyecto: toInt(get('proyecto')),
    tipoMaterial: toInt(get('tipoMaterial')),
    almacen: toInt(get('almacen')),
    carrier: toInt(get('carrier')),
  }
}

/** Adaptador: lee filtros de URLSearchParams (rutas GET: count/export). */
export const fromSearchParams = (sp: URLSearchParams) => (key: string): unknown => sp.get(key)

/** Adaptador: lee filtros de un body ya parseado (ruta POST: search). */
export const fromBody = (body: Record<string, unknown>) => (key: string): unknown => body[key]

/**
 * WHERE parametrizado sobre `VM` (alias de GASOAL_VMES). TenantID explícito además
 * de RLS. ES nunca interpolado. Reusado por search, count y export.
 */
export function buildVMWhere(tenantId: string, f: VMFilters): Prisma.Sql {
  const conds: Prisma.Sql[] = [
    Prisma.sql`VM.TenantID = ${tenantId}`,
    Prisma.sql`VM.ES = ${f.es ? 1 : 0}`,
  ]

  if (f.fechaInicio && f.fechaFin) conds.push(Prisma.sql`VM.FechaCaptura BETWEEN ${f.fechaInicio} AND ${f.fechaFin}`)
  if (f.idUsuario != null) conds.push(Prisma.sql`VM.IdUsuario = ${f.idUsuario}`)
  if (f.proyecto != null) conds.push(Prisma.sql`VM.IdProyecto = ${f.proyecto}`)
  if (f.tipoMaterial != null) conds.push(Prisma.sql`VM.IdTipoMaterial = ${f.tipoMaterial}`)
  if (f.almacen != null) conds.push(Prisma.sql`VM.IdAlmacenDestino = ${f.almacen}`)
  if (f.carrier != null) conds.push(Prisma.sql`VM.IdCarrier = ${f.carrier}`)

  return Prisma.join(conds, ' AND ')
}

/** COUNT(*) puede volver bigint -> Number seguro (NULL -> 0). */
export function toNumber(v: number | bigint | null | undefined): number {
  if (v == null) return 0

  return typeof v === 'bigint' ? Number(v) : v
}
