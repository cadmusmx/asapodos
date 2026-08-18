import { NextResponse } from 'next/server';

import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

import { Prisma } from '@prisma/client';

import { PERM, withPermission, writeTransactionLog } from '@gaso/shared';

import { withTenantContext } from '@/lib/tenant-context';

export const runtime = 'nodejs';

const s3 = new S3Client({
  region: process.env.S3_REGION,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? ''
  }
});

const S3_BUCKET = process.env.S3_BUCKET ?? '';

type RouteContext = { params: Promise<{ id: string; fileId: string }> };

export const DELETE = withPermission(
  'employees',
  async (_req, { auth, tenantId }, context: RouteContext) => {
    const { id, fileId: fileIdRaw } = await context.params;
    const employeeId = Number(id);
    const fileId = Number(fileIdRaw);

    if (!Number.isInteger(employeeId) || employeeId <= 0 || !Number.isInteger(fileId) || fileId <= 0) {
      return NextResponse.json({ message: 'Parámetros inválidos.' }, { status: 400 });
    }

    // Lee la fila para el borrado S3-first + audit.
    const row = await withTenantContext(tenantId, async tx => {
      const rows = await tx.$queryRaw<Array<{ FilePath: string; IsUrl: boolean | number; DocumentTypeID: number | null }>>(
        Prisma.sql`
          SELECT FilePath, IsUrl, DocumentTypeID
          FROM HumanCapital.EmployeeFiles
          WHERE TenantID = CAST(${tenantId} AS uniqueidentifier)
            AND EmployeeID = ${employeeId}
            AND FileID = ${fileId}
        `
      );

      return rows[0] ?? null;
    });

    if (!row) {
      return NextResponse.json({ message: 'Documento no encontrado.' }, { status: 404 });
    }

    // M12: S3 primero para docs nuevos (IsUrl=0, key en el bucket nuevo).
    // Legacy IsUrl=1 (URL a bucket viejo) → no se borra en S3.
    if (!Boolean(row.IsUrl)) {
      try {
        await s3.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: row.FilePath }));
      } catch (e) {
        console.error('[EMPLOYEE_DOC_DELETE_S3]', e);

        return NextResponse.json(
          { message: 'No se pudo borrar el archivo en S3; no se eliminó el registro.' },
          { status: 500 }
        );
      }
    }

    await withTenantContext(tenantId, async tx =>
      tx.$executeRaw(
        Prisma.sql`
          DELETE FROM HumanCapital.EmployeeFiles
          WHERE TenantID = CAST(${tenantId} AS uniqueidentifier)
            AND EmployeeID = ${employeeId}
            AND FileID = ${fileId}
        `
      )
    );

    writeTransactionLog({
      tenantId,
      tableName: 'HumanCapital.EmployeeFiles',
      action: 'DELETE',
      userId: auth.userId,
      appUser: auth.email ?? null,
      oldData: { fileId, employeeId, documentTypeId: row.DocumentTypeID },
      newData: null
    }).catch(() => { });

    return NextResponse.json({ data: { fileId } });
  },
  { bit: PERM.D }
);
