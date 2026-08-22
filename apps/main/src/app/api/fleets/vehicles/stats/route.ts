import { NextResponse } from 'next/server';

import { PERM, withPermission } from '@gaso/shared';

import { withTenantContext } from '@/lib/tenant-context';
import { buildVehicleWhere, parseVehicleFilters, toNumber } from '../_shared';

interface VehicleStatsRow {
  Total: number | bigint;
  PolizasVencidas: number | bigint;
  TarjetasVencidas: number | bigint;
  VerificacionProxima: number | bigint;
}

// POST /api/vehicles/vehicles/stats — tarjetas de métricas. Respeta los MISMOS filtros
// que el listado (sin paginado) para que las cifras concuerden. POST que LEE (bit R).
// Sin JOINs: los 4 agregados salen de columnas de `v` bajo el WHERE compartido.
export const POST = withPermission(
  'vehicles',
  async (req, { tenantId }) => {
    try {
      const body = (await req.json().catch(() => ({}))) as unknown;
      const filters = parseVehicleFilters(body);
      const where = buildVehicleWhere(tenantId, filters);

      const rows = await withTenantContext(tenantId, tx => tx.$queryRaw<VehicleStatsRow[]>`
        SELECT
          COUNT(*) AS Total,
          SUM(CASE WHEN v.FechaVencimientoPoliza IS NOT NULL
                    AND v.FechaVencimientoPoliza < CAST(GETDATE() AS date) THEN 1 ELSE 0 END) AS PolizasVencidas,
          SUM(CASE WHEN v.FechaVencimientoTarjeta IS NOT NULL
                    AND v.FechaVencimientoTarjeta < CAST(GETDATE() AS date) THEN 1 ELSE 0 END) AS TarjetasVencidas,
          SUM(CASE WHEN v.FechaProximaVerificacion IS NOT NULL
                    AND DATEDIFF(day, CAST(GETDATE() AS date), v.FechaProximaVerificacion) BETWEEN 0 AND 30
                   THEN 1 ELSE 0 END) AS VerificacionProxima
        FROM Fleet.Vehicles v
        WHERE ${where}
      `);

      const r = rows[0];

      return NextResponse.json({
        total: toNumber(r?.Total),
        polizasVencidas: toNumber(r?.PolizasVencidas),
        tarjetasVencidas: toNumber(r?.TarjetasVencidas),
        verificacionProxima: toNumber(r?.VerificacionProxima),
      });
    } catch (e) {
      console.error('[vehicles/stats]', e);

      return NextResponse.json({ message: 'Ha ocurrido un error inesperado' }, { status: 500 });
    }
  },
  { bit: PERM.R },
);
