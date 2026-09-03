// Helpers compartidos del módulo Logística de Material.
// El prefijo "_" evita que Next lo trate como ruta.
//
// A diferencia de Validación de Material (SQL inline), LM porta SPs SaaS-ificados (usp_LM_*).
// Aquí van la validación de sitios (calcada de log_material.js) y el tipado de payloads.
// Los SPs se invocan vía EXEC parametrizado desde cada ruta.

import { Prisma } from '@prisma/client'

export const isMissing = (v: unknown): boolean => v === undefined || v === null || v === ''

export interface Evidencia {
  idTipoEvidencia: number
  archivo: string // llave S3
  mimeType: string
  orden?: number
}

export interface EvidenciaEdit extends Evidencia {
  id: number
}

export interface Tarima {
  tarimaFoto: string // llave S3
  papeletaFoto: string // llave S3
  orden?: number
}

// Documento de cabecera: archivo general del arribo, una sola vez.
// Evita duplicar en cada sitio las fotos generales (unidad, material en unidad).
export interface Documento {
  nombre: string // etiqueta ingresada por el usuario
  archivo: string // llave S3
  mimeType?: string // permite distinguir PDF de imagen al renderizar
}

// Valida el bucket de documentos de cabecera. null/undefined = sin documentos (opcional).
export function validateDocumentos(docs: unknown): string | null {
  if (docs === undefined || docs === null) return null
  if (!Array.isArray(docs)) return 'documentos debe ser un arreglo'

  for (const d of docs) {
    if (isMissing(d?.nombre)) return 'Cada documento requiere nombre'
    if (isMissing(d?.archivo)) return 'Cada documento requiere archivo'
  }

  return null
}

// Sitio para creación / sitiosAdd (encabezado + hijos inline como arreglos).
export interface Sitio {
  idSitio: string
  nombreSitio: string
  descripcionMaterial: string
  materialFaltante: boolean
  descripcionFaltantes?: string
  descripcionIncidencias?: string
  tiposMaterial: number[]
  incidencias?: number[]
  evidencias: Evidencia[]
  tarimas?: Tarima[]
}

// Sitio para edición (id + encabezado full; hijos como diff del/add/edit).
export interface SitioEdit {
  id: number
  idSitio: string
  nombreSitio: string
  descripcionMaterial: string
  materialFaltante: boolean
  descripcionFaltantes?: string
  descripcionIncidencias?: string
  tiposDel?: number[]
  tiposAdd?: number[]
  incidenciasDel?: number[]
  incidenciasAdd?: number[]
  evidenciasDel?: number[]
  evidenciasEdit?: EvidenciaEdit[]
  evidenciasAdd?: Evidencia[]
  tarimas?: Tarima[] // presente = reemplazo completo del set del sitio; ausente = sin cambio
}

// Validación (equivalente a validateSitio / validateTarimas del legacy)

const MAX_TARIMAS = 50

export function validateTarimas(tarimas: unknown): string | null {
  if (tarimas === undefined || tarimas === null) return null // opcional
  if (!Array.isArray(tarimas)) return 'tarimas debe ser un arreglo'
  if (tarimas.length > MAX_TARIMAS) return `Máximo ${MAX_TARIMAS} tarimas por sitio`

  for (const t of tarimas) {
    if (isMissing(t?.tarimaFoto) || isMissing(t?.papeletaFoto)) {
      return 'Cada tarima requiere foto de tarima y de papeleta'
    }
  }

  return null
}

// Valida un sitio completo (creación y sitiosAdd).
export function validateSitio(s: unknown): string | null {
  const site = s as Sitio

  if (!site || typeof site !== 'object') return 'Sitio inválido'
  if (isMissing(site.idSitio) || isMissing(site.nombreSitio)) return 'Requiere idSitio y nombreSitio'
  if (isMissing(site.descripcionMaterial)) return 'Requiere descripción de material'
  if (site.materialFaltante === undefined || site.materialFaltante === null) return 'Indique material faltante'
  if (site.materialFaltante && isMissing(site.descripcionFaltantes)) return 'Describa los faltantes'
  if (!Array.isArray(site.tiposMaterial) || site.tiposMaterial.length === 0)
    return 'Requiere al menos un tipo de material'
  if (!Array.isArray(site.evidencias) || site.evidencias.length === 0) return 'Requiere al menos una evidencia'

  return validateTarimas(site.tarimas)
}

// Valida un sitio editado: id + encabezado completo (los hijos van como diff).
export function validateSitioEdit(s: unknown): string | null {
  const site = s as SitioEdit

  if (isMissing(site?.id)) return 'Requiere id'
  if (isMissing(site.idSitio) || isMissing(site.nombreSitio)) return 'Requiere idSitio y nombreSitio'
  if (isMissing(site.descripcionMaterial)) return 'Requiere descripción de material'
  if (site.materialFaltante === undefined || site.materialFaltante === null) return 'Indique material faltante'
  if (site.materialFaltante && isMissing(site.descripcionFaltantes)) return 'Describa los faltantes'

  return validateTarimas(site.tarimas)
}

// Rechaza (idSitio + nombreSitio) repetido en el mismo arribo; compara en minúsculas.
// Respeta UQ(IdLogistica, IdSitio, NombreSitio).
export function checkSitiosDuplicados(sitios: Array<{ idSitio?: string; nombreSitio?: string }>): boolean {
  const keys = sitios.map(
    s => `${(s?.idSitio ?? '').trim().toLowerCase()}|${(s?.nombreSitio ?? '').trim().toLowerCase()}`
  )

  return new Set(keys).size !== keys.length
}

// Parseo de Sitios (D11: el server parsea el JSON de SQL Server)

/**
 * usp_LM_GetList / usp_LM_GetByFolio devuelven `Sitios` como string JSON (FOR JSON PATH).
 * Se parsea en el server para no cargar al consumidor con JSON.parse anidado. Devuelve [] ante nulo o JSON inválido.
 */
export function parseSitios<T = unknown>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[]
  if (typeof raw !== 'string' || raw.trim() === '') return []

  try {
    const parsed = JSON.parse(raw)

    return Array.isArray(parsed) ? (parsed as T[]) : []
  } catch {
    return []
  }
}

// materialFaltante llega como bit (0/1) desde SQL Server -> boolean.
export function normalizeResumenSitio(s: Record<string, unknown>): Record<string, unknown> {
  return { ...s, materialFaltante: s.materialFaltante === true || s.materialFaltante === 1 }
}

// SQL Server acepta `EXEC sp @Param = value`. Cada valor va como parámetro real de Prisma (${...}), nunca interpolado.
//
// IMPORTANTE — nulls: Prisma no infiere tipo para un `null` de JS y lo envía tipado como int.
// Si el parámetro del SP es DATE/otro, choca ("int is incompatible with date").
// Como TODOS los params opcionales de las SPs declaran `= NULL` por defecto,
// la solución es OMITIR del EXEC los params en null/undefined:
//    el default del SP aplica el mismo NULL sin tipear nada.
// Los valores presentes (string, número, '') sí se envían y SQL Server los convierte al tipo del param.
// Nota: 0 y '' NO son null -> se envían (p. ej. @RE = 0, o NombreResponsable = '').

export interface SpParam {
  name: string
  value: unknown
}

/** `p('@IdXdock', 10)` -> par nombre/valor. El valor crudo se conserva para poder omitir nulls. */
export function p(name: string, value: unknown): SpParam {
  return { name, value }
}

/**
 * Construye `EXEC dbo.usp_X @A = ${a}, @B = ${b}` con params saneados.
 * Omite los params cuyo valor sea null o undefined (el SP usa su default NULL).
 */
export function execSp(sp: string, params: SpParam[]): Prisma.Sql {
  const present = params.filter(pr => pr.value !== null && pr.value !== undefined)
  const assignments = present.map(pr => Prisma.sql`${Prisma.raw(pr.name)} = ${pr.value as never}`)

  return Prisma.sql`EXEC ${Prisma.raw(sp)} ${Prisma.join(assignments, ', ')}`
}
