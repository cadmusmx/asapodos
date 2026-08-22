
// Imports actualizados del archivo:
import { NextResponse } from 'next/server';

import { Prisma } from '@prisma/client';
import { AUDIT_ACTIONS, withPermission, writeTransactionLog } from '@gaso/shared';

import { withTenantContext } from '@/lib/tenant-context';
import { buildWriteColumns, findUniqueConflict, parseVehiclePayload } from '../_write';

type RouteCtx = { params: Promise<{ id: string }> };

// Detalle completo: IDs crudos (para precargar el form) + nombres resueltos (modo lectura)
// + las 3 señales de vigencia derivadas. Fleet no está en Prisma -> tipos a mano.
interface VehicleDetailRow {
  IdAuto: number;
  Placa: string | null;
  NoEconomico: string | null;
  SerialVehiculo: string | null;
  SerialMotor: string | null;
  Modelo: string | null;
  Linea: string | null;
  Kilometraje: number;
  Poliza: string | null;
  Ubicacion: string | null;
  Region: number | null;
  Notas: string | null;
  Puertas: number | null;
  Traccion: string | null;

  Marca: number | null;
  MarcaNombre: string | null;
  Color: number | null;
  ColorNombre: string | null;
  Combustible: number | null;
  CombustibleNombre: string | null;
  TipoVehiculo: number | null;
  TipoVehiculoNombre: string | null;
  Estatus: number | null;
  EstatusNombre: string | null;
  IdEstadoPlaca: number | null;
  EstadoPlacaNombre: string | null;
  Empresa: number | null;
  AseguradoraNombre: string | null;
  Propietario: number | null;
  PropietarioNombre: string | null;
  Departamento: number | null;
  DepartamentoNombre: string | null;
  ConductorEmployeeID: number | null;
  ConductorNombre: string | null;
  ConductorNumero: string | null;

  FechaVencimientoPoliza: Date | null;
  FechaVencimientoTarjeta: Date | null;
  FechaVerificacion: Date | null;
  FechaProximaVerificacion: Date | null;
  VigenciaPoliza: string | null;
  VigenciaTarjeta: string | null;
  VerificacionDiasRestantes: number | null;

  CreatedAt: Date;
  UpdatedAt: Date | null;
}

export const GET = withPermission<RouteCtx>('vehicles', async (_req, { tenantId }, routeCtx) => {
  try {
    const { id } = await routeCtx.params;
    const idAuto = Number(id);

    if (!Number.isInteger(idAuto) || idAuto <= 0) {
      return NextResponse.json({ message: 'Vehículo inválido' }, { status: 400 });
    }

    const rows = await withTenantContext(tenantId, tx => tx.$queryRaw<VehicleDetailRow[]>`
      SELECT
        v.IdAuto, v.Placa, v.NoEconomico, v.SerialVehiculo, v.SerialMotor, v.Modelo, v.Linea,
        v.Kilometraje, v.Poliza, v.Ubicacion, v.Region, v.Notas, v.Puertas, v.Traccion,
        v.Marca,        ma.Descripcion    AS MarcaNombre,
        v.Color,        co.nombreColor    AS ColorNombre,
        v.Combustible,  cb.tipoCombustible AS CombustibleNombre,
        v.TipoVehiculo, tv.tipoVehiculo   AS TipoVehiculoNombre,
        v.Estatus,      es.nombreEstatus  AS EstatusNombre,
        v.IdEstadoPlaca, ep.Nombre        AS EstadoPlacaNombre,
        v.Empresa,      emp.Nombre        AS AseguradoraNombre,
        v.Propietario,  pro.Nombre        AS PropietarioNombre,
        v.Departamento, dep.Name          AS DepartamentoNombre,
        v.ConductorEmployeeID,
        LTRIM(RTRIM(cond.FirstName + ' ' + cond.LastName)) AS ConductorNombre,
        cond.EmployeeNumber AS ConductorNumero,
        v.FechaVencimientoPoliza, v.FechaVencimientoTarjeta, v.FechaVerificacion, v.FechaProximaVerificacion,
        CASE WHEN v.FechaVencimientoPoliza IS NULL THEN NULL
             WHEN v.FechaVencimientoPoliza < CAST(GETDATE() AS date) THEN 'VENCIDA' ELSE 'VIGENTE' END AS VigenciaPoliza,
        CASE WHEN v.FechaVencimientoTarjeta IS NULL THEN NULL
             WHEN v.FechaVencimientoTarjeta < CAST(GETDATE() AS date) THEN 'VENCIDA' ELSE 'VIGENTE' END AS VigenciaTarjeta,
        CASE WHEN v.FechaProximaVerificacion IS NULL THEN NULL
             ELSE IIF(DATEDIFF(day, CAST(GETDATE() AS date), v.FechaProximaVerificacion) < 0, 0,
                      DATEDIFF(day, CAST(GETDATE() AS date), v.FechaProximaVerificacion)) END AS VerificacionDiasRestantes,
        v.CreatedAt, v.UpdatedAt
      FROM Fleet.Vehicles v
      LEFT JOIN dbo.Cat_MarcaAuto ma        ON ma.IdMarca = v.Marca
      LEFT JOIN dbo.cat_color co            ON co.idColor = v.Color
      LEFT JOIN dbo.cat_combustible cb      ON cb.idCombustible = v.Combustible
      LEFT JOIN dbo.cat_tipoVehiculo tv     ON tv.idTipoVehiculo = v.TipoVehiculo
      LEFT JOIN dbo.cat_estatus es          ON es.idEstatus = v.Estatus
      LEFT JOIN dbo.Cat_Estados ep          ON ep.IdEstado = v.IdEstadoPlaca
      LEFT JOIN Fleet.EmpresasSeguros emp   ON emp.TenantID = v.TenantID AND emp.IdEmpresa = v.Empresa
      LEFT JOIN Fleet.Propietarios pro      ON pro.TenantID = v.TenantID AND pro.IdPropietario = v.Propietario
      LEFT JOIN HumanCapital.Departments dep ON dep.TenantID = v.TenantID AND dep.DepartmentID = v.Departamento
      LEFT JOIN HumanCapital.Employees cond  ON cond.TenantID = v.TenantID AND cond.EmployeeID = v.ConductorEmployeeID
      WHERE v.TenantID = CAST(${tenantId} AS uniqueidentifier) AND v.IdAuto = ${idAuto}
    `);

    if (rows.length === 0) {
      return NextResponse.json({ message: 'Vehículo no encontrado' }, { status: 404 });
    }

    return NextResponse.json(rows[0]);
  } catch (e) {
    console.error('[fleets/vehicles/[id] GET]', e);

    return NextResponse.json({ message: 'Ha ocurrido un error inesperado' }, { status: 500 });
  }
});

// PUT · edición parcial (bit U por default). La "baja" es solo mandar `estatus`
// a un valor terminal (Vendida / Fuera de flota): sin enforcement de transiciones.
export const PUT = withPermission<RouteCtx>('vehicles', async (req, { auth, tenantId }, routeCtx) => {
  const { id } = await routeCtx.params;
  const idAuto = Number(id);

  if (!Number.isInteger(idAuto) || idAuto <= 0) {
    return NextResponse.json({ message: 'Vehículo inválido' }, { status: 400 });
  }

  let payload;

  try {
    payload = parseVehiclePayload(await req.json());
  } catch (e) {
    return NextResponse.json({ message: e instanceof Error ? e.message : 'Body inválido' }, { status: 400 });
  }

  const { assigns } = buildWriteColumns(payload);

  if (assigns.length === 0) {
    return NextResponse.json({ message: 'No hay cambios que aplicar' }, { status: 400 });
  }

  try {
    const outcome = await withTenantContext(tenantId, async tx => {
      // Resolver primero: 404 si no existe (y captura el estado previo para auditoría).
      const before = await tx.$queryRaw<Array<{ IdAuto: number; Placa: string | null; Estatus: number | null }>>`
        SELECT IdAuto, Placa, Estatus FROM Fleet.Vehicles
        WHERE TenantID = CAST(${tenantId} AS uniqueidentifier) AND IdAuto = ${idAuto}
      `;

      if (before.length === 0) return { notFound: true as const };

      // Unique excluyendo el propio registro (permite reenviar la misma placa/VIN).
      const conflict = await findUniqueConflict(tx, tenantId, payload.placa, payload.serialVehiculo, idAuto);

      if (conflict) return { conflict };

      await tx.$executeRaw`
        UPDATE Fleet.Vehicles
        SET ${Prisma.join(assigns, ', ')}, UpdatedAt = sysutcdatetime(), UpdatedBy = ${auth.userId}
        WHERE TenantID = CAST(${tenantId} AS uniqueidentifier) AND IdAuto = ${idAuto}
      `;

      return { before: before[0] };
    });

    if ('notFound' in outcome) {
      return NextResponse.json({ message: 'Vehículo no encontrado' }, { status: 404 });
    }

    if ('conflict' in outcome) {
      const message =
        outcome.conflict === 'placa' ? 'Ya existe un vehículo con esa placa' : 'Ya existe un vehículo con ese número de serie (VIN)';

      return NextResponse.json({ message }, { status: 409 });
    }

    writeTransactionLog({
      tenantId,
      tableName: 'Fleet.Vehicles',
      action: AUDIT_ACTIONS.UPDATE,
      userId: auth.userId,
      appUser: auth.email ?? null,
      oldData: { idAuto, placa: outcome.before.Placa, estatus: outcome.before.Estatus },
      newData: { idAuto, ...payload },
    }).catch(() => { });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[fleets/vehicles/[id] PUT]', e);

    return NextResponse.json({ message: 'Ha ocurrido un error inesperado' }, { status: 500 });
  }
});
