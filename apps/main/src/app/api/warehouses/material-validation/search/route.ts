import { NextResponse } from 'next/server';

import { Prisma } from '@prisma/client';
import { PERM, withPermission } from '@gaso/shared';

import { withTenantContext } from '@/lib/tenant-context';

interface SearchBody {
  es?: boolean | string;
  fechaInicio?: string;
  fechaFin?: string;
  fechaInicioFin?: string;   // compat legacy: "inicio - fin"
  idUsuario?: number;
  proyecto?: number;
  tipoMaterial?: number;
  almacen?: number;
  carrier?: number;
}

function toDate(v?: string): Date | null {
  if (!v) return null;
  const d = new Date(v.trim());

  return isNaN(d.getTime()) ? null : d;
}

export const POST = withPermission(
  'material_validation',
  async (req: { json: () => Promise<any>; url: string | URL }, { tenantId }: { tenantId: string }) => {
    try {
      const body = (await req.json().catch(() => ({}))) as SearchBody;
      const url = new URL(req.url);

      const entradas = body.es === true || body.es === 'true';

      const pagina = Math.max(1, Number(url.searchParams.get('pagina')) || 1);
      const limite = Math.min(100, Math.max(1, Number(url.searchParams.get('limite')) || 10));
      const orden = url.searchParams.get('orden')?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

      // Rango de fechas: explícito (ISO) o compat "inicio - fin".
      let fInicio = toDate(body.fechaInicio);
      let fFin = toDate(body.fechaFin);

      if ((!fInicio || !fFin) && body.fechaInicioFin) {
        const [a, b] = body.fechaInicioFin.split(' - ');

        fInicio = toDate(a); fFin = toDate(b);
      }

      // Condiciones parametrizadas (ES ya NO interpolado).
      const conds: Prisma.Sql[] = [
        Prisma.sql`VM.TenantID = ${tenantId}`,
        Prisma.sql`VM.ES = ${entradas ? 1 : 0}`,
      ];

      if (fInicio && fFin) conds.push(Prisma.sql`VM.FechaCaptura BETWEEN ${fInicio} AND ${fFin}`);
      if (body.idUsuario != null) conds.push(Prisma.sql`VM.IdUsuario = ${body.idUsuario}`);
      if (body.proyecto != null) conds.push(Prisma.sql`VM.IdProyecto = ${body.proyecto}`);
      if (body.tipoMaterial != null) conds.push(Prisma.sql`VM.IdTipoMaterial = ${body.tipoMaterial}`);
      if (body.almacen != null) conds.push(Prisma.sql`VM.IdAlmacenDestino = ${body.almacen}`);
      if (body.carrier != null) conds.push(Prisma.sql`VM.IdCarrier = ${body.carrier}`);

      const where = Prisma.join(conds, ' AND ');

      // orden: valor de whitelist ('ASC'|'DESC'), seguro para Prisma.raw.
      const ordenSql = Prisma.raw(orden);

      type Row = Record<string, unknown> & { TotalRows?: number | bigint };

      const rows = await withTenantContext(tenantId, tx => tx.$queryRaw<Row[]>`
        SELECT VM.*, U.Nombre AS Responsable, pro.Proyecto, tm.Tipo AS TipoMaterial,
               al.Nombre AS AlmacenDestino, ca.Carrier,
               ( SELECT pm.Id AS id, pm.Clave AS cl, cm.Motivo AS clt, pm.Piezas AS pzs
                   FROM dbo.GASOAL_VMPiezasMotivo pm
                   LEFT JOIN dbo.Cat_VMMotivo cm ON pm.Clave = cm.Id
                   WHERE pm.IdVM = VM.Id
                   FOR JSON PATH ) AS PiezasMotivo,
               ( SELECT pe.Id AS id, pe.Clave AS cl, ce.Estado AS clt, pe.Piezas AS pzs
                   FROM dbo.GASOAL_VMPiezasEstadoF pe
                   LEFT JOIN dbo.Cat_VMEFisico ce ON pe.Clave = ce.Clave
                   WHERE pe.IdVM = VM.Id
                   FOR JSON PATH ) AS PiezasEstadoF,
               ( SELECT TOP 1 VFV.Id
                   FROM dbo.GASOAL_VinculosFolioValidacion VFV
                   WHERE VM.Folio = VFV.FolioEntrada
                      OR VM.Folio = VFV.FolioSalida
                      OR VM.Folio = VFV.FolioValidacion ) AS Vinculado,
               COUNT(*) OVER() AS TotalRows
          FROM dbo.GASOAL_VMES VM
          INNER JOIN dbo.GASOAL_VMAlmacenes al ON VM.IdAlmacenDestino = al.Id
          INNER JOIN dbo.Cat_VMProyecto pro ON VM.IdProyecto = pro.Id
          INNER JOIN dbo.Cat_VMTiposMaterial tm ON VM.IdTipoMaterial = tm.Id
          INNER JOIN dbo.Cat_VMCarrier ca ON VM.IdCarrier = ca.Id
          INNER JOIN dbo.GASOCO_Cat_Usuarios U ON VM.IdUsuario = U.IdUsuario
          WHERE ${where}
          ORDER BY VM.FechaCaptura ${ordenSql}
          OFFSET (${pagina} - 1) * ${limite} ROWS FETCH NEXT ${limite} ROWS ONLY
      `);

      // COUNT(*) OVER() = total del set filtrado ANTES del OFFSET/FETCH.
      const total = rows.length ? ((typeof rows[0].TotalRows === 'bigint' ? Number(rows[0].TotalRows) : rows[0].TotalRows) ?? 0) : 0;
      const items = rows.map(({ TotalRows, ...rest }) => rest);

      return NextResponse.json({ rows: items, total, pagina, limite });
    } catch (e) {
      console.error('[material-validation/search]', e);

      return NextResponse.json({ message: 'Ha ocurrido un error inesperado' }, { status: 500 });
    }
  },
  { bit: PERM.R },
);
