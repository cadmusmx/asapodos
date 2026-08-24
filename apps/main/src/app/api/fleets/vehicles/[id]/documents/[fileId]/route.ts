import { NextResponse } from 'next/server';

import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

import { PERM, withPermission, writeTransactionLog } from '@gaso/shared';

import { withTenantContext } from '@/lib/tenant-context';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string; fileId: string }> };

const s3 = new S3Client({
  region: process.env.S3_REGION,
  credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID ?? '', secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? '' },
});

const S3_BUCKET = process.env.S3_BUCKET ?? '';

export const DELETE = withPermission(
  'vehicles',
  async (_req, { auth, tenantId }, context: RouteContext) => {
    const { id, fileId: fileIdRaw } = await context.params;
    const vehicleId = Number(id);
    const fileId = Number(fileIdRaw);

    if (!Number.isInteger(vehicleId) || vehicleId <= 0 || !Number.isInteger(fileId) || fileId <= 0) {
      return NextResponse.json({ message: 'Parámetros inválidos' }, { status: 400 });
    }

    const row = await withTenantContext(tenantId, async tx => {
      const rows = await tx.$queryRaw<Array<{ FilePath: string; DocumentTypeID: number | null }>>`
        SELECT FilePath, DocumentTypeID FROM Fleet.VehicleFiles
        WHERE TenantID = CAST(${tenantId} AS uniqueidentifier) AND VehicleID = ${vehicleId} AND FileID = ${fileId}
      `;

      return rows[0] ?? null;
    });

    if (!row) return NextResponse.json({ message: 'Documento no encontrado' }, { status: 404 });

    // S3-primero: si falla el borrado del objeto, NO se elimina el registro (evita huérfanos inversos).
    try {
      await s3.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: row.FilePath }));
    } catch (e) {
      console.error('[VEHICLE_DOC_DELETE_S3]', e);

      return NextResponse.json({ message: 'No se pudo borrar el archivo en S3; no se eliminó el registro.' }, { status: 500 });
    }

    await withTenantContext(tenantId, async tx =>
      tx.$executeRaw`
        DELETE FROM Fleet.VehicleFiles
        WHERE TenantID = CAST(${tenantId} AS uniqueidentifier) AND VehicleID = ${vehicleId} AND FileID = ${fileId}
      `,
    );

    writeTransactionLog({
      tenantId,
      tableName: 'Fleet.VehicleFiles',
      action: 'DELETE',
      userId: auth.userId,
      appUser: auth.email ?? null,
      oldData: { fileId, vehicleId, documentTypeId: row.DocumentTypeID },
      newData: null,
    }).catch(() => { });

    return NextResponse.json({ data: { fileId } });
  },
  { bit: PERM.D },
);
