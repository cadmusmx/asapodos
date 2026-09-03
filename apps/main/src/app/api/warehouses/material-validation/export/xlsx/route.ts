// Exportación del listado a XLSX multi-hoja. GET (descarga nativa). Bit R.
// Filtros por query (mismos que /search, vía buildVMWhere) + count autoritativo.
//
//   ?...&countOnly=1  -> { count, max }   (conteo en vivo del modal)
//   ?...              -> .xlsx attachment (revalida el límite 409 si excede)
//
// Hojas: Registros (1 folio/fila) + Piezas + Tarimas + Documentos (1 ítem/fila,
// con columna Folio como clave de unión tabular puro, sin separadores).

import { NextResponse } from 'next/server'

import {
  withPermission, PERM, buildWorkbook, xlsxResponse, xlsxFilename, explodeJson,
  resolveFileUrl as toUrl, type SheetSpec, type ExportConfig,
} from '@gaso/shared'

import { withTenantContext } from '@/lib/tenant-context'
import { buildVMWhere, fromSearchParams, parseVMFilters, toNumber } from '../../_shared-filters'

// Fila cruda del query (cabecera + JSON de hijos).
interface VMExportRow {
  Folio: string
  ES: boolean
  Fecha: string
  Proyecto: string
  TipoMaterial: string
  AlmacenDestino: string
  Carrier: string
  Responsable: string
  NombreSitio: string
  IdSitio: string
  CuentaCliente: string
  TotalPiezas: number
  NumTarimas: number
  Status: number
  FechaCaptura: string
  Notas: string | null
  PiezasMotivo: string
  PiezasEstadoF: string
  Tarimas: string | null
  MaterialDocumentos: string | null
}

const fmtFecha = (v: unknown) => (v ? new Date(String(v)).toLocaleDateString('es-MX') : '')
const fmtFechaHora = (v: unknown) => (v ? new Date(String(v)).toLocaleString('es-MX') : '')

// Tarimas: objeto { tarima_i, papeleta_i }, NO arreglo -> se expande a pares.
// (Mismo shape que parsea el detalle candidato a centralizar en @gaso/shared con LM.)
function tarimaPairs(json: unknown): Array<{ n: number; tarima: string; papeleta: string }> {
  if (typeof json !== 'string' || !json) return []

  try {
    const obj = JSON.parse(json) as Record<string, string>
    const nums = new Set<number>()

    for (const k of Object.keys(obj)) {
      const m = k.match(/_(\d+)$/)

      if (m) nums.add(Number(m[1]))
    }

    return [...nums].sort((a, b) => a - b).map(n => ({
      n,
      tarima: obj[`tarima_${n}`] ?? '',
      papeleta: obj[`papeleta_${n}`] ?? '',
    }))
  } catch {
    return []
  }
}

const VM_EXPORT_CONFIG: ExportConfig<VMExportRow> = {
  maxRows: 500, // por registro (no cuenta piezas/tarimas/docs). LM usará uno menor.
  filenameBase: 'validacion-material',
  toSheets: (rows): SheetSpec[] => {
    const registros: SheetSpec = {
      name: 'Registros',
      columns: [
        { header: 'Folio', key: 'Folio', text: true },
        { header: 'Tipo', key: 'Tipo' },
        { header: 'Fecha', key: 'Fecha' },
        { header: 'Proyecto', key: 'Proyecto' },
        { header: 'Tipo de material', key: 'TipoMaterial' },
        { header: 'Almacén destino', key: 'AlmacenDestino' },
        { header: 'Carrier', key: 'Carrier' },
        { header: 'Responsable', key: 'Responsable' },
        { header: 'Sitio', key: 'NombreSitio' },
        { header: 'ID sitio', key: 'IdSitio', text: true },
        { header: 'Cuenta cliente', key: 'CuentaCliente' },
        { header: 'Total piezas', key: 'TotalPiezas' },
        { header: 'Tarimas', key: 'NumTarimas' },
        { header: 'Estado', key: 'Estado' },
        { header: 'Notas', key: 'Notas' },
        { header: 'Capturado', key: 'FechaCaptura' },
      ],
      rows: rows.map(r => ({
        Folio: r.Folio,
        Tipo: r.ES ? 'Entrada' : 'Salida',
        Fecha: fmtFecha(r.Fecha),
        Proyecto: r.Proyecto,
        TipoMaterial: r.TipoMaterial,
        AlmacenDestino: r.AlmacenDestino,
        Carrier: r.Carrier,
        Responsable: r.Responsable,
        NombreSitio: r.NombreSitio,
        IdSitio: r.IdSitio,
        CuentaCliente: r.CuentaCliente,
        TotalPiezas: r.TotalPiezas,
        NumTarimas: r.NumTarimas,
        Estado: r.Status === 0 ? 'Pendiente' : 'Revisado',
        Notas: r.Notas ?? '',
        FechaCaptura: fmtFechaHora(r.FechaCaptura),
      })),
    }

    const keyFolio = { Folio: (r: VMExportRow) => r.Folio }

    const piezas: SheetSpec = {
      name: 'Piezas',
      columns: [
        { header: 'Folio', key: 'Folio', text: true },
        { header: 'Clasificación', key: 'Clasificacion' },
        { header: 'Categoría', key: 'Categoria' },
        { header: 'Piezas', key: 'Piezas' },
      ],
      rows: [
        ...explodeJson(rows, 'PiezasMotivo', keyFolio, c => ({
          Clasificacion: 'Motivo', Categoria: c.clt ?? '', Piezas: c.pzs ?? '',
        })),
        ...explodeJson(rows, 'PiezasEstadoF', keyFolio, c => ({
          Clasificacion: 'Estado físico', Categoria: c.clt ?? '', Piezas: c.pzs ?? '',
        })),
      ],
    }

    const tarimas: SheetSpec = {
      name: 'Tarimas',
      columns: [
        { header: 'Folio', key: 'Folio', text: true },
        { header: 'Tarima', key: 'Tarima' },
        { header: 'Foto tarima', key: 'FotoTarima', text: true },
        { header: 'Papeleta', key: 'Papeleta', text: true },
      ],
      rows: rows.flatMap(r =>
        tarimaPairs(r.Tarimas).map(t => ({
          Folio: r.Folio,
          Tarima: `Tarima ${t.n}`,
          FotoTarima: toUrl(t.tarima),
          Papeleta: toUrl(t.papeleta),
        })),
      ),
    }

    const documentos: SheetSpec = {
      name: 'Documentos',
      columns: [
        { header: 'Folio', key: 'Folio', text: true },
        { header: 'Nombre', key: 'Nombre' },
        { header: 'Archivo', key: 'Archivo', text: true },
      ],
      rows: explodeJson(rows, 'MaterialDocumentos', keyFolio, c => ({
        Nombre: c.name ?? '', Archivo: toUrl(c.file),
      })),
    }

    return [registros, piezas, tarimas, documentos]
  },
}

export const GET = withPermission('material_validation', async (req, { tenantId }) => {
  try {
    const url = new URL(req.url)
    const filters = parseVMFilters(fromSearchParams(url.searchParams))
    const where = buildVMWhere(tenantId, filters)
    const countOnly = url.searchParams.get('countOnly') === '1'
    const { maxRows, filenameBase, toSheets } = VM_EXPORT_CONFIG

    const count = await withTenantContext(tenantId, async tx => {
      const res = await tx.$queryRaw<Array<{ n: number | bigint }>>`
        SELECT COUNT(*) AS n FROM dbo.GASOAL_VMES VM WHERE ${where}`

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

    const rows = await withTenantContext(tenantId, tx => tx.$queryRaw<VMExportRow[]>`
      SELECT VM.Folio, VM.ES, VM.Fecha, pro.Proyecto, tm.Tipo AS TipoMaterial,
             al.Nombre AS AlmacenDestino, ca.Carrier, LTRIM(RTRIM(UE.FirstName + ' ' + UE.LastName)) AS Responsable,
             VM.NombreSitio, VM.IdSitio, VM.CuentaCliente, VM.TotalPiezas, VM.NumTarimas,
             VM.Status, VM.FechaCaptura, VM.Notas, VM.Tarimas, VM.MaterialDocumentos,
             ( SELECT pm.Clave AS cl, cm.Motivo AS clt, pm.Piezas AS pzs
                 FROM dbo.GASOAL_VMPiezasMotivo pm
                 LEFT JOIN dbo.Cat_VMMotivo cm ON pm.Clave = cm.Id
                 WHERE pm.IdVM = COALESCE(voOut.IdIN, VM.Id) FOR JSON PATH ) AS PiezasMotivo,
             ( SELECT pe.Clave AS cl, ce.Estado AS clt, pe.Piezas AS pzs
                 FROM dbo.GASOAL_VMPiezasEstadoF pe
                 LEFT JOIN dbo.Cat_VMEFisico ce ON pe.Clave = ce.Clave
                 WHERE pe.IdVM = COALESCE(voOut.IdIN, VM.Id) FOR JSON PATH ) AS PiezasEstadoF
        FROM dbo.GASOAL_VMES VM
        LEFT JOIN dbo.GASOAL_VMOut voOut ON voOut.TenantID = VM.TenantID AND voOut.IdOut = VM.Id
        INNER JOIN dbo.GASOAL_VMAlmacenes al ON VM.IdAlmacenDestino = al.Id
        INNER JOIN dbo.Cat_VMProyecto pro ON VM.IdProyecto = pro.Id
        INNER JOIN dbo.Cat_VMTiposMaterial tm ON VM.IdTipoMaterial = tm.Id
        INNER JOIN dbo.Cat_Carriers ca ON VM.IdCarrier = ca.Id
        INNER JOIN dbo.GASOCO_Cat_Usuarios U ON VM.IdUsuario = U.IdUsuario
        INNER JOIN HumanCapital.Employees UE ON UE.TenantID = U.TenantID AND UE.EmployeeID = U.EmployeeID
        WHERE ${where}
        ORDER BY VM.FechaCaptura DESC
    `)

    return xlsxResponse(buildWorkbook(toSheets(rows)), xlsxFilename(filenameBase))
  } catch (e) {
    console.error('[material-validation/export/xlsx]', e)

    return NextResponse.json({ message: 'Ha ocurrido un error inesperado' }, { status: 500 })
  }
}, { bit: PERM.R })
