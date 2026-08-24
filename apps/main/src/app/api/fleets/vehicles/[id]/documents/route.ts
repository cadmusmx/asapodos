import { NextResponse } from 'next/server';

import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

import { PERM, withPermission, writeTransactionLog } from '@gaso/shared';

import { withTenantContext, getTenantSlugFromHeaders } from '@/lib/tenant-context';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string }> };

const s3 = new S3Client({
  region: process.env.S3_REGION,
  credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID ?? '', secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? '' },
});

const S3_BUCKET = process.env.S3_BUCKET ?? '';
const S3_PUBLIC_BASE_URL = process.env.S3_PUBLIC_BASE_URL ?? '';
const ALLOWED = ['.jpg', '.jpeg', '.png', '.pdf'];
const MAX_BYTES = 10 * 1024 * 1024;

// Segmento legible de la key por tipo (fallback al id si aparece un tipo nuevo).
const DOC_CODE: Record<number, string> = { 1: 'tarjeta-circulacion', 2: 'poliza-seguro' };

// VehicleFiles NO tiene IsUrl: la key siempre resuelve contra el bucket nuevo.
const resolveUrl = (key: string): string => {
  const k = (key ?? '').trim().replace(/^\/+/, '');

  if (!k) return '';
  if (k.startsWith('http://') || k.startsWith('https://')) return k;

  return S3_PUBLIC_BASE_URL ? `${S3_PUBLIC_BASE_URL.replace(/\/+$/, '')}/${k}` : k;
};

interface FileRow {
  FileID: number;
  DocumentTypeID: number | null;
  DocumentTypeName: string | null;
  FilePath: string;
}
interface TypeRow { DocumentTypeID: number; Name: string };

export const GET = withPermission(
  'vehicles',
  async (_req, { tenantId }, context: RouteContext) => {
    const { id } = await context.params;
    const vehicleId = Number(id);

    if (!Number.isInteger(vehicleId) || vehicleId <= 0) {
      return NextResponse.json({ message: 'Vehículo inválido' }, { status: 400 });
    }

    return withTenantContext(tenantId, async tx => {
      const files = await tx.$queryRaw<FileRow[]>`
        SELECT f.FileID, f.DocumentTypeID, dt.Name AS DocumentTypeName, f.FilePath
        FROM Fleet.VehicleFiles f
        LEFT JOIN Fleet.VehicleDocumentTypes dt ON dt.DocumentTypeID = f.DocumentTypeID
        WHERE f.TenantID = CAST(${tenantId} AS uniqueidentifier) AND f.VehicleID = ${vehicleId}
        ORDER BY dt.Name
      `;

      // Tipos disponibles para el selector de subida (global, activos).
      const types = await tx.$queryRaw<TypeRow[]>`
        SELECT DocumentTypeID, Name FROM Fleet.VehicleDocumentTypes WHERE IsActive = 1 ORDER BY Name
      `;

      return NextResponse.json({
        files: files.map(r => ({
          fileId: r.FileID,
          documentTypeId: r.DocumentTypeID,
          documentTypeName: r.DocumentTypeName,
          url: resolveUrl(r.FilePath),
        })),
        types: types.map(t => ({ id: t.DocumentTypeID, nombre: t.Name })),
      });
    });
  },
  { bit: PERM.R },
);

export const POST = withPermission(
  'vehicles',
  async (req, { auth, tenantId }, context: RouteContext) => {
    const { id } = await context.params;
    const vehicleId = Number(id);

    if (!Number.isInteger(vehicleId) || vehicleId <= 0) {
      return NextResponse.json({ message: 'Vehículo inválido' }, { status: 400 });
    }

    const form = await req.formData().catch(() => null);
    const file = form?.get('file');
    const documentTypeId = Number(form?.get('documentTypeId'));

    if (!(file instanceof File)) return NextResponse.json({ message: 'No se recibió ningún archivo' }, { status: 400 });

    if (!Number.isInteger(documentTypeId) || documentTypeId <= 0) {
      return NextResponse.json({ message: 'Tipo de documento inválido' }, { status: 400 });
    }

    const name = file.name ?? '';
    const dot = name.lastIndexOf('.');
    const ext = dot >= 0 ? name.slice(dot).toLowerCase() : '';

    if (!ALLOWED.includes(ext)) {
      return NextResponse.json({ message: 'Tipo de archivo no permitido. Solo JPG, PNG y PDF.' }, { status: 400 });
    }

    if (file.size > MAX_BYTES) return NextResponse.json({ message: 'El archivo excede 10 MB' }, { status: 400 });

    // Pre-check ANTES de tocar S3: vehículo del tenant + tipo válido/activo + no duplicado.
    const precheck = await withTenantContext(tenantId, async tx => {
      const veh = await tx.$queryRaw<Array<{ IdAuto: number }>>`
        SELECT IdAuto FROM Fleet.Vehicles WHERE TenantID = CAST(${tenantId} AS uniqueidentifier) AND IdAuto = ${vehicleId}
      `;

      if (!veh[0]) return 'VEHICLE_NOT_FOUND';

      const type = await tx.$queryRaw<Array<{ DocumentTypeID: number }>>`
        SELECT DocumentTypeID FROM Fleet.VehicleDocumentTypes WHERE DocumentTypeID = ${documentTypeId} AND IsActive = 1
      `;

      if (!type[0]) return 'TYPE_INVALID';

      const dup = await tx.$queryRaw<Array<{ n: number }>>`
        SELECT COUNT(1) AS n FROM Fleet.VehicleFiles
        WHERE TenantID = CAST(${tenantId} AS uniqueidentifier) AND VehicleID = ${vehicleId} AND DocumentTypeID = ${documentTypeId}
      `;

      return Number(dup[0]?.n ?? 0) > 0 ? 'DUPLICATE' : 'OK';
    });

    if (precheck === 'VEHICLE_NOT_FOUND') return NextResponse.json({ message: 'El vehículo no existe' }, { status: 404 });
    if (precheck === 'TYPE_INVALID') return NextResponse.json({ message: 'Tipo de documento no válido' }, { status: 400 });

    if (precheck === 'DUPLICATE') {
      return NextResponse.json({ message: 'Ya existe un documento de ese tipo. Elimínalo primero.' }, { status: 409 });
    }

    const slug = getTenantSlugFromHeaders(req.headers) || tenantId;
    const buffer = Buffer.from(await file.arrayBuffer());
    const ts = new Date().toISOString().replace(/[:.]/g, '').slice(0, 15);
    const folder = `${process.env.S3_FOLDER ?? 'Pr'}/`;
    const code = DOC_CODE[documentTypeId] ?? `tipo-${documentTypeId}`;
    const key = `${folder}${slug}/fleet/vehicles/${vehicleId}/${code}-${ts}${ext}`;

    try {
      await s3.send(new PutObjectCommand({ Bucket: S3_BUCKET, Key: key, Body: buffer, ContentType: file.type || 'application/octet-stream' }));
    } catch (e) {
      console.error('[VEHICLE_DOC_UPLOAD_S3]', e);

      return NextResponse.json({ message: 'Error al subir el archivo' }, { status: 500 });
    }

    // INSERT; si choca por carrera, limpia el objeto S3 recién subido.
    try {
      const inserted = await withTenantContext(tenantId, async tx =>
        tx.$queryRaw<Array<{ FileID: number }>>`
          INSERT INTO Fleet.VehicleFiles (TenantID, VehicleID, DocumentTypeID, FilePath, CreatedBy)
          OUTPUT INSERTED.FileID
          VALUES (CAST(${tenantId} AS uniqueidentifier), ${vehicleId}, ${documentTypeId}, ${key}, ${auth.userId})
        `,
      );

      const fileId = inserted[0]?.FileID ?? null;

      writeTransactionLog({
        tenantId,
        tableName: 'Fleet.VehicleFiles',
        action: 'CREATE',
        userId: auth.userId,
        appUser: auth.email ?? null,
        newData: { fileId, vehicleId, documentTypeId, key },
      }).catch(() => { });

      return NextResponse.json({ data: { fileId, url: resolveUrl(key) } }, { status: 201 });
    } catch (error) {
      await s3.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key })).catch(() => { });
      const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR';

      if (message.includes('UNIQUE')) {
        return NextResponse.json({ message: 'Ya existe un documento de ese tipo.' }, { status: 409 });
      }

      console.error('[VEHICLE_DOC_INSERT]', { message });

      return NextResponse.json({ message: 'Error al registrar el documento' }, { status: 500 });
    }
  },
  { bit: PERM.W },
);
