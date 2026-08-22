import { NextResponse } from 'next/server';

import { Prisma } from '@prisma/client';
import { AUDIT_ACTIONS, withPermission, writeTransactionLog } from '@gaso/shared';

import { withTenantContext } from '@/lib/tenant-context';
import { buildWriteColumns, findUniqueConflict, parseVehiclePayload } from './_write';

export const runtime = 'nodejs';

export const POST = withPermission('vehicles', async (req, { auth, tenantId }) => {
  let payload;

  try {
    payload = parseVehiclePayload(await req.json());
  } catch (e) {
    return NextResponse.json({ message: e instanceof Error ? e.message : 'Body inválido' }, { status: 400 });
  }

  // La placa es la clave de negocio (índice único, buscable). Requerida en el alta.
  if (!payload.placa) {
    return NextResponse.json({ message: 'La placa es requerida' }, { status: 400 });
  }

  try {
    const outcome = await withTenantContext(tenantId, async tx => {
      const conflict = await findUniqueConflict(tx, tenantId, payload.placa, payload.serialVehiculo);

      if (conflict) return { conflict };

      // Identidad del contexto: TenantID y CreatedBy nunca del body. cols/vals nunca vacíos (placa presente).
      const { cols, vals } = buildWriteColumns(payload);

      const inserted = await tx.$queryRaw<Array<{ IdAuto: number }>>`
        INSERT INTO Fleet.Vehicles (TenantID, CreatedBy, ${Prisma.join(cols, ', ')})
        OUTPUT INSERTED.IdAuto
        VALUES (CAST(${tenantId} AS uniqueidentifier), ${auth.userId}, ${Prisma.join(vals, ', ')})
      `;

      return { id: inserted[0].IdAuto };
    });

    if ('conflict' in outcome) {
      const message =
        outcome.conflict === 'placa' ? 'Ya existe un vehículo con esa placa' : 'Ya existe un vehículo con ese número de serie (VIN)';

      return NextResponse.json({ message }, { status: 409 });
    }

    writeTransactionLog({
      tenantId,
      tableName: 'Fleet.Vehicles',
      action: AUDIT_ACTIONS.INSERT,
      userId: auth.userId,
      appUser: auth.email ?? null,
      newData: { idAuto: outcome.id, ...payload },
    }).catch(() => { });

    return NextResponse.json({ success: true, id: outcome.id }, { status: 201 });
  } catch (e) {
    console.error('[fleets/vehicles POST]', e);

    return NextResponse.json({ message: 'Ha ocurrido un error inesperado' }, { status: 500 });
  }
});
