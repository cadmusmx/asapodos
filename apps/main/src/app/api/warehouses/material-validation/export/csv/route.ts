// Exportación del listado a CSV. GET (para descarga nativa vía navegador). Bit R.
// Filtros por query params (mismos que /search, vía buildVMWhere).
//
//   ?...&countOnly=1  -> { count }         (para el conteo en vivo del modal)
//   ?...              -> CSV attachment     (revalida el límite; 409 si excede)
//
// El límite EXPORT_MAX_ROWS se revalida SIEMPRE en server: el botón deshabilitado
// del modal es UX; la autoridad es esta ruta (mismo principio que el gating RBAC).

import { NextResponse } from 'next/server';

import { withPermission, PERM, EXPORT_MAX_ROWS, toCsv, csvResponse, csvFilename, type CsvColumn } from '@gaso/shared';

import { withTenantContext } from '@/lib/tenant-context';
import { buildVMWhere, fromSearchParams, parseVMFilters, toNumber } from '../../_shared-filters';

interface ExportRow {
  Folio: string;
  Fecha: string;
  Proyecto: string;
  TipoMaterial: string;
  AlmacenDestino: string;
  Carrier: string;
  Responsable: string;
  NombreSitio: string;
  IdSitio: string;
  CuentaCliente: string;
  TotalPiezas: number;
  NumTarimas: number;
  Status: number;
  ES: boolean;
  FechaCaptura: string;
}

// Folio / IdSitio como texto (="...") contra la autoconversión de Excel.
const VM_EXPORT_COLUMNS: CsvColumn<ExportRow>[] = [
  { header: 'Folio', value: r => r.Folio, text: true },
  { header: 'Tipo', value: r => (r.ES ? 'Entrada' : 'Salida') },
  { header: 'Fecha', value: r => (r.Fecha ? new Date(r.Fecha).toLocaleDateString('es-MX') : '') },
  { header: 'Proyecto', value: r => r.Proyecto },
  { header: 'Tipo de material', value: r => r.TipoMaterial },
  { header: 'Almacén destino', value: r => r.AlmacenDestino },
  { header: 'Carrier', value: r => r.Carrier },
  { header: 'Responsable', value: r => r.Responsable },
  { header: 'Sitio', value: r => r.NombreSitio },
  { header: 'ID sitio', value: r => r.IdSitio, text: true },
  { header: 'Cuenta cliente', value: r => r.CuentaCliente },
  { header: 'Total piezas', value: r => r.TotalPiezas },
  { header: 'Tarimas', value: r => r.NumTarimas },
  { header: 'Estado', value: r => (r.Status === 0 ? 'Pendiente' : 'Revisado') },
  { header: 'Capturado', value: r => (r.FechaCaptura ? new Date(r.FechaCaptura).toLocaleString('es-MX') : '') },
];

export const GET = withPermission('material_validation', async (req, { tenantId }) => {
  try {
    const url = new URL(req.url);
    const filters = parseVMFilters(fromSearchParams(url.searchParams));
    const where = buildVMWhere(tenantId, filters);
    const countOnly = url.searchParams.get('countOnly') === '1';

    // Conteo autoritativo (mismo WHERE). Alimenta el modal y controla el límite.
    const count = await withTenantContext(tenantId, async tx => {
      const res = await tx.$queryRaw<Array<{ n: number | bigint }>>`
        SELECT COUNT(*) AS n FROM dbo.GASOAL_VMES VM WHERE ${where}`;

      return toNumber(res[0]?.n);
    });

    if (countOnly) {
      return NextResponse.json({ count, max: EXPORT_MAX_ROWS });
    }

    if (count > EXPORT_MAX_ROWS) {
      return NextResponse.json(
        { message: `Ajuste el rango de fechas para reducir la cantidad de registros a exportar, debe ser menor o igual a ${EXPORT_MAX_ROWS}`, count, max: EXPORT_MAX_ROWS },
        { status: 409 },
      );
    }

    if (count === 0) {
      return NextResponse.json({ message: 'No hay registros para exportar con los filtros actuales', count }, { status: 409 });
    }

    // Universo filtrado completo, SIN OFFSET/FETCH (no es la página, es todo).
    const rows = await withTenantContext(tenantId, tx => tx.$queryRaw<ExportRow[]>`
      SELECT VM.Folio, VM.Fecha, pro.Proyecto, tm.Tipo AS TipoMaterial,
             al.Nombre AS AlmacenDestino, ca.Carrier, U.Nombre AS Responsable,
             VM.NombreSitio, VM.IdSitio, VM.CuentaCliente, VM.TotalPiezas, VM.NumTarimas,
             VM.Status, VM.ES, VM.FechaCaptura
        FROM dbo.GASOAL_VMES VM
        INNER JOIN dbo.GASOAL_VMAlmacenes al ON VM.IdAlmacenDestino = al.Id
        INNER JOIN dbo.Cat_VMProyecto pro ON VM.IdProyecto = pro.Id
        INNER JOIN dbo.Cat_VMTiposMaterial tm ON VM.IdTipoMaterial = tm.Id
        INNER JOIN dbo.Cat_Carriers ca ON VM.IdCarrier = ca.Id
        INNER JOIN dbo.GASOCO_Cat_Usuarios U ON VM.IdUsuario = U.IdUsuario
        WHERE ${where}
        ORDER BY VM.FechaCaptura DESC
    `);

    return csvResponse(toCsv(rows, VM_EXPORT_COLUMNS), csvFilename('validacion-material'));
  } catch (e) {
    console.error('[material-validation/export]', e);

    return NextResponse.json({ message: 'Ha ocurrido un error inesperado' }, { status: 500 });
  }
}, { bit: PERM.R });
