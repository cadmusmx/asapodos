import { withTenantContext } from '@/lib/tenant-context'

import type { Documento } from './_shared'
import { execSp, p } from './_shared'

/**
 * Servicio núcleo D·LM (S0) — Entrega (OutDerived) a partir de una recepción.
 * PURO (sin transporte HTTP): lo consumen la ruta web (out/, verify-folio/) y,
 * más adelante, el BFF móvil (S5). La escritura vive en usp_LM_CreateEntrega
 * (módulo SP-driven); aquí solo se valida/arma y se hace EXEC dentro de un
 * withTenantContext(tx). Las tablas de enlace no tienen RLS y se aíslan por el
 * JOIN al IN (bajo RLS) + filtro TenantID explícito dentro del SP.
 */

// Normaliza el folio de recepción. Acepta cualquier origen: deeplink escaneado
// (gasosaas://ml/LMR-…), folio escaneado como texto, o tecleado (con/sin LMR-).
// Toma lo que va tras el último '/' y asegura el prefijo. Colación CI en BD, así
// que el case no importa para matchear.
export function normalizeInFolio(raw: string): string {
  const str = raw.trim()
  const ftxt = str.slice(str.lastIndexOf('/') + 1)

  return /^LMR-/i.test(ftxt) ? ftxt : `LMR-${ftxt}`
}

export type VerifyReason = 'VALID' | 'ALL_DELIVERED' | 'NOT_FOUND' | 'NOT_IN'

export interface VerifyResult {
  reason: VerifyReason
  folio: string // folio de recepción (IN) normalizado
  idIn?: number // presente solo cuando VALID
}

/**
 * verifyFolioIn (LM) — clausura DERIVADA de sitios (sin tabla-marcador).
 * Una sola query, gateada por RE=1 y con EXISTS (corta al primer sitio pendiente):
 *   0 filas          → NOT_FOUND
 *   RE=0             → NOT_IN
 *   RE=1 & hay pend. → VALID
 *   RE=1 & sin pend. → ALL_DELIVERED
 * No es la autoridad (lo son la validación del SP y el UNIQUE(IdSitio)); es la
 * afordancia previa al submit. El AND lm.RE=1 evita el anti-join en OUTs.
 */
export async function verifyFolioIn(tenantId: string, rawFolio: string): Promise<VerifyResult> {
  const folio = normalizeInFolio(rawFolio)

  return withTenantContext(tenantId, async tx => {
    const rows = await tx.$queryRaw<Array<{ Id: number; RE: boolean | number; HasPending: boolean | number }>>`
      SELECT lm.Id, lm.RE,
        CASE WHEN lm.RE = 1 AND EXISTS (
            SELECT 1 FROM dbo.GASOAL_LMSitios s
            WHERE s.IdLogistica = lm.Id
              AND NOT EXISTS (SELECT 1 FROM dbo.GASOAL_LMSitiosOut o WHERE o.IdSitio = s.Id)
        ) THEN 1 ELSE 0 END AS HasPending
      FROM dbo.GASOAL_LM lm
      WHERE lm.TenantID = ${tenantId} AND lm.Folio = ${folio}
    `

    if (rows.length === 0) return { reason: 'NOT_FOUND', folio }

    const esIn = rows[0].RE === true || rows[0].RE === 1

    if (!esIn) return { reason: 'NOT_IN', folio }

    const hasPending = rows[0].HasPending === true || rows[0].HasPending === 1

    if (!hasPending) return { reason: 'ALL_DELIVERED', folio }

    return { reason: 'VALID', folio, idIn: rows[0].Id }
  })
}

// Datos generales capturados en la entrega (NO se heredan del IN).
export interface OutGenerales {
  fecha: string
  nombreResponsable?: string | null
  unidadPlaca: string
  nombreOperador: string
  horaLlegada: string
  horaInicioDescarga: string // se rotula "inicio de carga" en la UI de entrega
  horaSalida: string
  confirmado: boolean
}

export interface SubmitOutInput {
  tenantId: string
  userId: number
  folioIn: string // recepción de origen (se normaliza)
  sitios: number[] // GASOAL_LMSitios.Id (PK) seleccionados; el SP valida pertenencia+pendiente
  generales: OutGenerales
  documentos?: Documento[] | null // merge final (heredados + nuevos); si se omite, el SP hereda IN.Documentos
  folioOut?: string | null // LME-; app manda el suyo (QR directo). Web omite → el SP lo genera
  qr?: string | null // key S3; app. Web omite → el SP hereda IN.Qr
}

export interface SubmitOutResult {
  idOut: number
  folioOut: string
}

/**
 * submitOut — crea la entrega vía usp_LM_CreateEntrega (un solo EXEC atómico):
 * copia la logística [IN], aplica los generales capturados, genera/hereda folio y
 * QR, y marca los sitios seleccionados en GASOAL_LMSitiosOut (bucle en el SP).
 * No hace pre-checks: la validación (recepción válida, sitios del IN y pendientes,
 * todo-o-nada) vive en el SP y sale como THROW tipado que la ruta mapea a HTTP.
 * execSp omite los params null/undefined → el SP aplica su default (genera folio,
 * hereda Qr/Documentos del IN).
 */
export async function submitOut(input: SubmitOutInput): Promise<SubmitOutResult> {
  const folioIn = normalizeInFolio(input.folioIn)
  const g = input.generales
  const docs = input.documentos && input.documentos.length ? JSON.stringify(input.documentos) : null

  const params = [
    p('@TenantID', input.tenantId),
    p('@IdUsuario', input.userId),
    p('@FolioIN', folioIn),
    p('@Sitios', JSON.stringify(input.sitios)),
    p('@Fecha', g.fecha),
    p('@NombreResponsable', g.nombreResponsable ?? null),
    p('@UnidadPlaca', g.unidadPlaca),
    p('@NombreOperador', g.nombreOperador),
    p('@HoraLlegada', g.horaLlegada),
    p('@HoraInicioDescarga', g.horaInicioDescarga),
    p('@HoraSalida', g.horaSalida),
    p('@Confirmado', g.confirmado ? 1 : 0),
    p('@Documentos', docs),
    p('@Folio', input.folioOut ?? null),
    p('@Qr', input.qr ?? null),
  ]

  const rows = await withTenantContext(input.tenantId, tx =>
    tx.$queryRaw<Array<{ Id: number; Folio: string }>>(execSp('dbo.usp_LM_CreateEntrega', params)),
  )

  const created = rows[0]

  return { idOut: created.Id, folioOut: created.Folio }
}
