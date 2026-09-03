// Exportación del listado de LM a XLSX multi-hoja. GET (descarga nativa). Bit R.
// Filtros por query (mismos predicados que usp_LM_GetList, vía buildLMWhere) + count.
//
//   ?...&countOnly=1  -> { count, max }   (conteo en vivo del modal)
//   ?...              -> .xlsx attachment (revalida el límite; 409 si excede)
//
// Hojas (calco del legacy): Entregas/Recepciones (1 folio/fila, con conteos y tiempos
// calculados) + Material por sitio + Evidencias + Incidencias + Tarimas (1 ítem/fila,
// Folio como clave de unión; tabular puro, sin separadores). Sin hoja Documentos.
//
// LM es SP-driven pero el export re-consulta inline: necesita el universo sin paginar
// con los hijos completos (el SP de listado da resumen). Sitios se resuelven por
// enlace para las entregas derivadas (mismo UNION que el detalle).

import { NextResponse } from 'next/server'

import {
  withPermission, PERM, buildWorkbook, xlsxResponse, xlsxFilename, resolveFileUrl,
  type SheetSpec, type ExportConfig
} from '@gaso/shared'

import { withTenantContext } from '@/lib/tenant-context'
import { buildLMWhere, fromSearchParams, parseLMFilters, toNumber } from '../../_shared-filters'

// Fila cruda del query: cabecera + Sitios (JSON con material/evidencias/incidencias/tarimas).
interface LMExportRow {
  Folio: string
  RE: boolean
  Fecha: string // YYYY-MM-DD
  Xdock: string
  Carrier: string
  EsOtro: boolean
  OtroCarrier: string | null
  Responsable: string | null
  UnidadPlaca: string
  NombreOperador: string
  HoraLlegada: string // HH:MM:SS
  HoraInicioDescarga: string
  HoraSalida: string
  FechaCreacion: string // YYYY-MM-DD
  Sitios: string | null
}

// Sitio (shape recortado que arma el subquery del export).
interface ExpTipo { tipo: string }
interface ExpEvi { tipo: string; archivo: string }
interface ExpTar { orden: number; tarimaFoto: string; papeletaFoto: string }
interface ExpSitio {
  idSitio: string
  nombreSitio: string
  descripcionMaterial: string | null
  materialFaltante: boolean
  descripcionFaltantes: string | null
  descripcionIncidencias: string | null
  tiposMaterial: ExpTipo[]
  incidencias: ExpTipo[]
  evidencias: ExpEvi[]
  tarimas: ExpTar[]
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

// 'YYYY-MM-DD' -> 'D mmm YYYY' (sin Date, evita corrimiento por zona horaria).
const fmtFecha = (v: unknown): string => {
  const s = String(v ?? '').slice(0, 10)
  const [y, m, d] = s.split('-').map(Number)

  return y && m && d ? `${d} ${MESES[m - 1]} ${y}` : ''
}

const toMin = (hms?: string): number | null => {
  if (!hms) return null

  const [h, m] = hms.split(':').map(Number)

  return Number.isNaN(h) || Number.isNaN(m) ? null : h * 60 + m
}

// 'HH:MM:SS' -> 'HH:MM'.
const hhmm = (hms?: string): string => {
  const t = toMin(hms)

  return t === null ? '' : `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
}

// Diferencia entre dos horas del mismo día -> 'Xh Ym' (formato del legacy).
const diffHM = (from?: string, to?: string): string => {
  const a = toMin(from)
  const b = toMin(to)

  if (a === null || b === null) return ''

  let d = b - a

  if (d < 0) d += 24 * 60

  return `${Math.floor(d / 60)}h ${d % 60}m`
}

const carrierLabel = (r: LMExportRow): string => (r.EsOtro ? r.OtroCarrier ?? '' : r.Carrier)

const sitioLabel = (s: ExpSitio): string => `${s.idSitio}-${s.nombreSitio}`

const parseArr = <T,>(json: unknown): T[] => {
  if (typeof json !== 'string' || !json) return []

  try {
    const a = JSON.parse(json)

    return Array.isArray(a) ? a : []
  } catch {
    return []
  }
}

const LM_EXPORT_CONFIG: ExportConfig<LMExportRow> = {
  maxRows: 250, // por registro (no cuenta sitios/hijos). Menor que VM (un registro = N sitios).
  filenameBase: 'logistica-material',
  toSheets: (rows): SheetSpec[] => {
    // Nombre de la hoja cabecera según el eje exportado.
    const regName = rows.every(r => r.RE) ? 'Recepciones' : rows.every(r => !r.RE) ? 'Entregas' : 'Registros'

    const registros: SheetSpec = {
      name: regName,
      columns: [
        { header: 'Folio', key: 'Folio', text: true },
        { header: 'Tipo', key: 'Tipo' },
        { header: 'Responsable', key: 'Responsable' },
        { header: 'Fecha', key: 'Fecha' },
        { header: 'XDOCK', key: 'Xdock' },
        { header: 'Carrier', key: 'Carrier' },
        { header: 'Unidad / Placa', key: 'UnidadPlaca', text: true },
        { header: 'Operador', key: 'Operador' },
        { header: 'Llegada de la unidad', key: 'Llegada' },
        { header: 'Inicio de la carga', key: 'Inicio' },
        { header: 'Salida de la unidad', key: 'Salida' },
        { header: 'Tiempo de estadía', key: 'Estadia' },
        { header: 'Tiempo de descarga', key: 'Descarga' },
        { header: 'Sitios', key: 'Sitios' },
        { header: 'Detalle sitios', key: 'DetalleSitios' },
        { header: 'Faltante', key: 'Faltante' },
        { header: 'Incidencias', key: 'Incidencias' },
        { header: 'Evidencias', key: 'Evidencias' },
        { header: 'Fecha captura', key: 'FechaCaptura' },
      ],
      rows: rows.map(r => {
        const sitios = parseArr<ExpSitio>(r.Sitios)

        return {
          Folio: r.Folio,
          Tipo: r.RE ? 'Recepción' : 'Entrega',
          Responsable: r.Responsable ?? '',
          Fecha: fmtFecha(r.Fecha),
          Xdock: r.Xdock,
          Carrier: carrierLabel(r),
          UnidadPlaca: r.UnidadPlaca,
          Operador: r.NombreOperador,
          Llegada: hhmm(r.HoraLlegada),
          Inicio: hhmm(r.HoraInicioDescarga),
          Salida: hhmm(r.HoraSalida),
          Estadia: diffHM(r.HoraLlegada, r.HoraSalida),
          Descarga: diffHM(r.HoraInicioDescarga, r.HoraSalida),
          Sitios: sitios.length,
          DetalleSitios: sitios.map(sitioLabel).join(', '),
          Faltante: sitios.some(s => s.materialFaltante) ? 'Sí' : 'No',
          Incidencias: sitios.reduce((a, s) => a + s.incidencias.length, 0),
          Evidencias: sitios.reduce((a, s) => a + s.evidencias.length, 0),
          FechaCaptura: fmtFecha(r.FechaCreacion),
        }
      }),
    }

    const materialPorSitio: SheetSpec = {
      name: 'Material por sitio',
      columns: [
        { header: 'Folio', key: 'Folio', text: true },
        { header: 'Sitio', key: 'Sitio' },
        { header: 'Tipos', key: 'Tipos' },
        { header: 'Descripción', key: 'Descripcion' },
        { header: 'Faltante', key: 'Faltante' },
        { header: 'Detalle', key: 'Detalle' },
      ],
      rows: rows.flatMap(r =>
        parseArr<ExpSitio>(r.Sitios).map(s => ({
          Folio: r.Folio,
          Sitio: sitioLabel(s),
          Tipos: s.tiposMaterial.map(t => t.tipo).join(', '),
          Descripcion: s.descripcionMaterial ?? '',
          Faltante: s.materialFaltante ? 'Sí' : 'No',
          Detalle: s.descripcionFaltantes ?? '',
        })),
      ),
    }

    const evidencias: SheetSpec = {
      name: 'Evidencias',
      columns: [
        { header: 'Folio', key: 'Folio', text: true },
        { header: 'Sitio', key: 'Sitio' },
        { header: 'Tipo', key: 'Tipo' },
        { header: 'URL', key: 'URL', text: true },
      ],
      rows: rows.flatMap(r =>
        parseArr<ExpSitio>(r.Sitios).flatMap(s =>
          s.evidencias.map(ev => ({
            Folio: r.Folio,
            Sitio: sitioLabel(s),
            Tipo: ev.tipo,
            URL: resolveFileUrl(ev.archivo),
          })),
        ),
      ),
    }

    const incidencias: SheetSpec = {
      name: 'Incidencias',
      columns: [
        { header: 'Folio', key: 'Folio', text: true },
        { header: 'Sitio', key: 'Sitio' },
        { header: 'Tipo', key: 'Tipo' },
        { header: 'Descripción', key: 'Descripcion' },
      ],
      rows: rows.flatMap(r =>
        parseArr<ExpSitio>(r.Sitios).flatMap(s =>
          s.incidencias.map(inc => ({
            Folio: r.Folio,
            Sitio: sitioLabel(s),
            Tipo: inc.tipo,
            Descripcion: s.descripcionIncidencias ?? '',
          })),
        ),
      ),
    }

    const tarimas: SheetSpec = {
      name: 'Tarimas',
      columns: [
        { header: 'Folio', key: 'Folio', text: true },
        { header: 'Sitio', key: 'Sitio' },
        { header: 'Tarima', key: 'Tarima' },
        { header: 'Foto tarima', key: 'FotoTarima', text: true },
        { header: 'Foto papeleta', key: 'FotoPapeleta', text: true },
      ],
      rows: rows.flatMap(r =>
        parseArr<ExpSitio>(r.Sitios).flatMap(s =>
          s.tarimas.map((t, i) => ({
            Folio: r.Folio,
            Sitio: sitioLabel(s),
            Tarima: t.orden ?? i + 1,
            FotoTarima: resolveFileUrl(t.tarimaFoto),
            FotoPapeleta: resolveFileUrl(t.papeletaFoto),
          })),
        ),
      ),
    }

    return [registros, materialPorSitio, evidencias, incidencias, tarimas]
  },
}

export const GET = withPermission('material_logistics', async (req, { tenantId }) => {
  try {
    const url = new URL(req.url)
    const filters = parseLMFilters(fromSearchParams(url.searchParams))
    const where = buildLMWhere(tenantId, filters)
    const countOnly = url.searchParams.get('countOnly') === '1'
    const { maxRows, filenameBase, toSheets } = LM_EXPORT_CONFIG

    // Conteo autoritativo (mismo WHERE). Alimenta el modal y controla el límite.
    const count = await withTenantContext(tenantId, async tx => {
      const res = await tx.$queryRaw<Array<{ n: number | bigint }>>`
        SELECT COUNT(*) AS n FROM dbo.GASOAL_LM lm WHERE ${where}`

      return toNumber(res[0]?.n)
    })

    if (countOnly) {
      return NextResponse.json({ count, max: maxRows })
    }

    if (count > maxRows) {
      return NextResponse.json(
        { message: `Ajuste el rango de fechas para reducir la cantidad de registros a exportar, debe ser menor o igual a ${maxRows}`, count, max: maxRows },
        { status: 409 },
      )
    }

    if (count === 0) {
      return NextResponse.json({ message: 'No hay registros para exportar con los filtros actuales', count }, { status: 409 })
    }

    // Universo filtrado completo, SIN OFFSET/FETCH. Sitios por enlace para entregas
    // derivadas (UNION propios/enlace, como el detalle).
    const rows = await withTenantContext(tenantId, tx => tx.$queryRaw<LMExportRow[]>`
      SELECT
        lm.Folio, lm.RE,
        CONVERT(VARCHAR(10), lm.Fecha, 23) AS Fecha,
        x.Nombre AS Xdock,
        c.Carrier AS Carrier, c.EsOtro AS EsOtro, lm.OtroCarrier,
        ISNULL(lm.NombreResponsable, NULLIF(LTRIM(RTRIM(CONCAT(e.FirstName, ' ', e.LastName))), '')) AS Responsable,
        lm.UnidadPlaca, lm.NombreOperador,
        CONVERT(VARCHAR(8), lm.HoraLlegada, 108)        AS HoraLlegada,
        CONVERT(VARCHAR(8), lm.HoraInicioDescarga, 108) AS HoraInicioDescarga,
        CONVERT(VARCHAR(8), lm.HoraSalida, 108)         AS HoraSalida,
        CONVERT(VARCHAR(10), lm.FechaCreacion, 23) AS FechaCreacion,
        JSON_QUERY(ISNULL((
          SELECT
            s.IdSitio AS idSitio, s.NombreSitio AS nombreSitio,
            s.DescripcionMaterial AS descripcionMaterial,
            s.MaterialFaltante AS materialFaltante,
            s.DescripcionFaltantes AS descripcionFaltantes,
            s.DescripcionIncidencias AS descripcionIncidencias,
            JSON_QUERY(ISNULL((
              SELECT tm.Nombre AS tipo
              FROM dbo.GASOAL_LMSitioMaterial t
              INNER JOIN dbo.Cat_LMTiposMaterial tm ON t.IdTipoMaterial = tm.Id
              WHERE t.IdLogisticaSitio = s.Id FOR JSON PATH
            ), '[]')) AS tiposMaterial,
            JSON_QUERY(ISNULL((
              SELECT ti.Nombre AS tipo
              FROM dbo.GASOAL_LMSitioIncidencias i
              INNER JOIN dbo.Cat_LMTiposIncidencia ti ON i.IdTipoIncidencia = ti.Id
              WHERE i.IdLogisticaSitio = s.Id FOR JSON PATH
            ), '[]')) AS incidencias,
            JSON_QUERY(ISNULL((
              SELECT te.Nombre AS tipo, ev.Archivo AS archivo
              FROM dbo.GASOAL_LMSitioEvidencias ev
              INNER JOIN dbo.Cat_LMTiposEvidencia te ON ev.IdTipoEvidencia = te.Id
              WHERE ev.IdLogisticaSitio = s.Id
              ORDER BY ev.Orden, ev.Id FOR JSON PATH
            ), '[]')) AS evidencias,
            JSON_QUERY(ISNULL((
              SELECT tr.Orden AS orden, tr.TarimaFoto AS tarimaFoto, tr.PapeletaFoto AS papeletaFoto
              FROM dbo.GASOAL_LMSitioTarimas tr
              WHERE tr.IdLogisticaSitio = s.Id
              ORDER BY tr.Orden, tr.Id FOR JSON PATH
            ), '[]')) AS tarimas
          FROM (
            SELECT s0.Id AS SitioId FROM dbo.GASOAL_LMSitios s0 WHERE s0.IdLogistica = lm.Id
            UNION ALL
            SELECT o.IdSitio AS SitioId FROM dbo.GASOAL_LMSitiosOut o WHERE o.IdOut = lm.Id
          ) src
          INNER JOIN dbo.GASOAL_LMSitios s ON s.Id = src.SitioId
          ORDER BY s.Id
          FOR JSON PATH
        ), '[]')) AS Sitios
      FROM dbo.GASOAL_LM lm
      INNER JOIN dbo.Cat_LMXdocks x        ON lm.IdXdock   = x.Id
      INNER JOIN dbo.GASOCO_Cat_Usuarios u ON lm.IdUsuario = u.IdUsuario
      LEFT  JOIN HumanCapital.Employees  e ON e.TenantID = u.TenantID AND e.EmployeeID = u.EmployeeID
      INNER JOIN dbo.Cat_Carriers c        ON lm.IdCarrier = c.Id
      WHERE ${where}
      ORDER BY lm.FechaCreacion DESC
    `)

    return xlsxResponse(buildWorkbook(toSheets(rows)), xlsxFilename(filenameBase))
  } catch (e) {
    console.error('[material-logistics/export/xlsx]', e)

    return NextResponse.json({ message: 'Ha ocurrido un error inesperado' }, { status: 500 })
  }
}, { bit: PERM.R })
