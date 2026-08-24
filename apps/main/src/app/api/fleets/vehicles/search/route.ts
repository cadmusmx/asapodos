import { NextResponse } from 'next/server';

import { Prisma } from '@prisma/client';
import { PERM, withPermission } from '@gaso/shared';

import { withTenantContext } from '@/lib/tenant-context';
import { buildVehicleWhere, parseVehicleFilters, resolveSort, toNumber } from '../_shared';

// Fila cruda del listado (tipos a mano: Fleet NO está en Prisma).
interface VehicleListRow {
  IdAuto: number;
  Placa: string | null;
  NoEconomico: string | null;
  Modelo: string | null;
  Marca: string | null;
  Estatus: string | null;
  Aseguradora: string | null;
  Propietario: string | null;
  Departamento: string | null;
  Conductor: string | null;
  Kilometraje: number;
  FechaVencimientoPoliza: Date | null;
  FechaVencimientoTarjeta: Date | null;
  FechaProximaVerificacion: Date | null;
  VigenciaPoliza: string | null;
  VigenciaTarjeta: string | null;
  VerificacionDiasRestantes: number | null;
  TotalRows: number | bigint;
  DocumentCount: number | bigint;
}

// POST /api/fleets/vehicles/search — listado filtrado + paginado. POST que LEE (bit R).
// Query: ?pagina=1&limite=10&orden=DESC&sort=placa. Filtros por body.
export const POST = withPermission(
  'vehicles',
  async (req, { tenantId }) => {
    try {
      const body = (await req.json().catch(() => ({}))) as unknown;
      const filters = parseVehicleFilters(body);

      const url = new URL(req.url);
      const pagina = Math.max(1, Number(url.searchParams.get('pagina')) || 1);
      const limite = Math.min(100, Math.max(1, Number(url.searchParams.get('limite')) || 10));
      const orden = url.searchParams.get('orden')?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

      const where = buildVehicleWhere(tenantId, filters);
      const ordenSql = Prisma.raw(orden);                       // whitelist 'ASC'|'DESC'
      const sortSql = Prisma.raw(resolveSort(url.searchParams.get('sort'))); // whitelist SORT_MAP

      const rows = await withTenantContext(tenantId, tx => tx.$queryRaw<VehicleListRow[]>`
        SELECT
          v.IdAuto,
          v.Placa,
          v.NoEconomico,
          v.Modelo,
          ma.Descripcion    AS Marca,
          es.nombreEstatus  AS Estatus,
          emp.Nombre        AS Aseguradora,
          pro.Nombre        AS Propietario,
          dep.Name          AS Departamento,
          LTRIM(RTRIM(cond.FirstName + ' ' + cond.LastName)) AS Conductor,
          v.Kilometraje,
          v.FechaVencimientoPoliza,
          v.FechaVencimientoTarjeta,
          v.FechaProximaVerificacion,
          CASE WHEN v.FechaVencimientoPoliza IS NULL THEN NULL
               WHEN v.FechaVencimientoPoliza < CAST(GETDATE() AS date) THEN 'VENCIDA' ELSE 'VIGENTE' END AS VigenciaPoliza,
          CASE WHEN v.FechaVencimientoTarjeta IS NULL THEN NULL
               WHEN v.FechaVencimientoTarjeta < CAST(GETDATE() AS date) THEN 'VENCIDA' ELSE 'VIGENTE' END AS VigenciaTarjeta,
          CASE WHEN v.FechaProximaVerificacion IS NULL THEN NULL
               ELSE IIF(DATEDIFF(day, CAST(GETDATE() AS date), v.FechaProximaVerificacion) < 0, 0,
                        DATEDIFF(day, CAST(GETDATE() AS date), v.FechaProximaVerificacion)) END AS VerificacionDiasRestantes,
          (SELECT COUNT(*) FROM Fleet.VehicleFiles df
             WHERE df.TenantID = v.TenantID AND df.VehicleID = v.IdAuto) AS DocumentCount,
          COUNT(*) OVER() AS TotalRows
        FROM Fleet.Vehicles v
        LEFT JOIN dbo.Cat_MarcaAuto ma       ON ma.IdMarca = v.Marca
        LEFT JOIN dbo.cat_estatus es         ON es.idEstatus = v.Estatus
        LEFT JOIN Fleet.EmpresasSeguros emp  ON emp.TenantID = v.TenantID AND emp.IdEmpresa = v.Empresa
        LEFT JOIN Fleet.Propietarios pro     ON pro.TenantID = v.TenantID AND pro.IdPropietario = v.Propietario
        LEFT JOIN HumanCapital.Departments dep ON dep.TenantID = v.TenantID AND dep.DepartmentID = v.Departamento
        LEFT JOIN HumanCapital.Employees cond  ON cond.TenantID = v.TenantID AND cond.EmployeeID = v.ConductorEmployeeID
        WHERE ${where}
        ORDER BY ${sortSql} ${ordenSql}, v.IdAuto ASC
        OFFSET (${pagina} - 1) * ${limite} ROWS FETCH NEXT ${limite} ROWS ONLY
      `);

      // COUNT(*) OVER() = total del set filtrado ANTES del OFFSET/FETCH.
      const total = rows.length ? toNumber(rows[0].TotalRows) : 0;

      const items = rows.map(({ TotalRows, DocumentCount, ...rest }) => ({
        ...rest,
        DocumentCount: toNumber(DocumentCount),
      }));

      return NextResponse.json({ rows: items, total, pagina, limite });
    } catch (e) {
      console.error('[vehicles/search]', e);

      return NextResponse.json({ message: 'Ha ocurrido un error inesperado' }, { status: 500 });
    }
  },
  { bit: PERM.R },
);
