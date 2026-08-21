import { NextResponse } from 'next/server';

import { Prisma } from '@prisma/client';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

import { PERM, withPermission, EMPLOYEE_DOCUMENTS, writeTransactionLog } from '@gaso/shared';

import { withTenantContext, getTenantSlugFromHeaders } from '@/lib/tenant-context';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string }> };

const S3_PUBLIC_BASE_URL = process.env.S3_PUBLIC_BASE_URL ?? '';

// IsUrl=1 → FilePath ya es URL completa (docs legacy). IsUrl=0 → key en el bucket nuevo.
const resolveUrl = (filePath: string, isUrl: boolean): string => {
  const src = (filePath ?? '').trim();

  if (!src) return '';
  if (isUrl || src.startsWith('http://') || src.startsWith('https://')) return src;

  const key = src.replace(/^\/+/, '');

  return S3_PUBLIC_BASE_URL ? `${S3_PUBLIC_BASE_URL.replace(/\/+$/, '')}/${key}` : key;
};

type FileRow = {
  FileID: number;
  DocumentTypeID: number | null;
  DocumentTypeName: string | null;
  FilePath: string;
  IsUrl: boolean | number;
};

// setup (arriba del archivo):
const s3 = new S3Client({
  region: process.env.S3_REGION,
  credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID ?? '', secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? '' }
});

const S3_BUCKET = process.env.S3_BUCKET ?? '';
const ALLOWED = ['.jpg', '.jpeg', '.png', '.pdf'];
const MAX_BYTES = 10 * 1024 * 1024;

// id → código (invierte el mirror) para el segmento de la key
const DOCUMENT_CODE_BY_ID: Record<number, string> = Object.fromEntries(
  Object.entries(EMPLOYEE_DOCUMENTS).map(([code, docId]) => [docId, code])
);

export const POST = withPermission(
  'employees',
  async (req, { auth, tenantId }, context: RouteContext) => {
    const { id } = await context.params;
    const employeeId = Number(id);

    if (!Number.isInteger(employeeId) || employeeId <= 0) {
      return NextResponse.json({ message: 'Empleado inválido.' }, { status: 400 });
    }

    const form = await req.formData().catch(() => null);
    const file = form?.get('file');
    const documentTypeId = Number(form?.get('documentTypeId'));

    if (!(file instanceof File)) return NextResponse.json({ message: 'No se recibió ningún archivo.' }, { status: 400 });

    if (!Number.isInteger(documentTypeId) || documentTypeId <= 0) {
      return NextResponse.json({ message: 'Tipo de documento inválido.' }, { status: 400 });
    }

    const name = file.name ?? '';
    const dot = name.lastIndexOf('.');
    const ext = dot >= 0 ? name.slice(dot).toLowerCase() : '';

    if (!ALLOWED.includes(ext)) {
      return NextResponse.json({ message: 'Tipo de archivo no permitido. Solo JPG, PNG y PDF.' }, { status: 400 });
    }

    if (file.size > MAX_BYTES) return NextResponse.json({ message: 'El archivo excede 10 MB.' }, { status: 400 });

    // Pre-check: empleado del tenant + UNIQUE por tipo (antes de tocar S3).
    const precheck = await withTenantContext(tenantId, async tx => {
      const emp = await tx.$queryRaw<Array<{ EmployeeID: number }>>(
        Prisma.sql`SELECT EmployeeID FROM HumanCapital.Employees WHERE TenantID = CAST(${tenantId} AS uniqueidentifier) AND EmployeeID = ${employeeId}`
      );

      if (!emp[0]) return 'EMPLOYEE_NOT_FOUND';

      const dup = await tx.$queryRaw<Array<{ n: number }>>(
        Prisma.sql`SELECT COUNT(1) AS n FROM HumanCapital.EmployeeFiles WHERE TenantID = CAST(${tenantId} AS uniqueidentifier) AND EmployeeID = ${employeeId} AND DocumentTypeID = ${documentTypeId}`
      );

      return Number(dup[0]?.n ?? 0) > 0 ? 'DUPLICATE' : 'OK';
    });

    if (precheck === 'EMPLOYEE_NOT_FOUND') return NextResponse.json({ message: 'El empleado no existe.' }, { status: 404 });

    if (precheck === 'DUPLICATE') {
      return NextResponse.json({ message: 'Ya existe un documento de ese tipo. Elimínalo primero.' }, { status: 409 });
    }

    // Sube a S3 (bucket nuevo, IsUrl=0 + key).
    const slug = getTenantSlugFromHeaders(req.headers) || tenantId;
    const buffer = Buffer.from(await file.arrayBuffer());
    const ts = new Date().toISOString().replace(/[:.]/g, '').slice(0, 15);
    const folder = `${process.env.S3_FOLDER ?? 'Pr'}/`;
    const documento = DOCUMENT_CODE_BY_ID[documentTypeId] ?? 'Otro';
    const key = `${folder}${slug}/human_capital/employees/${employeeId}/${documento}-${ts}${ext}`;

    try {
      await s3.send(new PutObjectCommand({ Bucket: S3_BUCKET, Key: key, Body: buffer, ContentType: file.type || 'application/octet-stream' }));
    } catch (e) {
      console.error('[EMPLOYEE_DOC_UPLOAD_S3]', e);

      return NextResponse.json({ message: 'Error al subir el archivo.' }, { status: 500 });
    }

    // INSERT; si choca por carrera, limpia el objeto S3 recién subido.
    try {
      const inserted = await withTenantContext(tenantId, async tx =>
        tx.$queryRaw<Array<{ FileID: number }>>(
          Prisma.sql`
            INSERT INTO HumanCapital.EmployeeFiles (TenantID, EmployeeID, DocumentTypeID, FilePath, IsUrl, CreatedBy)
            OUTPUT inserted.FileID
            VALUES (CAST(${tenantId} AS uniqueidentifier), ${employeeId}, ${documentTypeId}, ${key}, 0, ${auth.userId})
          `
        )
      );

      const fileId = inserted[0]?.FileID ?? null;

      writeTransactionLog({
        tenantId, tableName: 'HumanCapital.EmployeeFiles', action: 'CREATE',
        userId: auth.userId, appUser: auth.email ?? null, oldData: null,
        newData: { fileId, employeeId, documentTypeId, key }
      }).catch(() => { });

      return NextResponse.json({ data: { fileId, key } }, { status: 201 });
    } catch (error) {
      await s3.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key })).catch(() => { });
      const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR';

      if (message.includes('EmployeeFiles_UNIQUE') || message.includes('UNIQUE')) {
        return NextResponse.json({ message: 'Ya existe un documento de ese tipo.' }, { status: 409 });
      }

      console.error('[EMPLOYEE_DOC_INSERT]', { message });

      return NextResponse.json({ message: 'Error al registrar el documento.' }, { status: 500 });
    }
  },
  { bit: PERM.W }
);

export const GET = withPermission(
  'employees',
  async (_req, { tenantId }, context: RouteContext) => {
    const { id } = await context.params;
    const employeeId = Number(id);

    if (!Number.isInteger(employeeId) || employeeId <= 0) {
      return NextResponse.json({ message: 'Empleado inválido.' }, { status: 400 });
    }

    return withTenantContext(tenantId, async tx => {
      const rows = await tx.$queryRaw<FileRow[]>(
        Prisma.sql`
          SELECT
            f.FileID,
            f.DocumentTypeID,
            dt.Name AS DocumentTypeName,
            f.FilePath,
            f.IsUrl
          FROM HumanCapital.EmployeeFiles f
          LEFT JOIN HumanCapital.DocumentTypes dt
            ON dt.DocumentTypeID = f.DocumentTypeID
          WHERE f.TenantID = CAST(${tenantId} AS uniqueidentifier)
            AND f.EmployeeID = ${employeeId}
          ORDER BY dt.Name
        `
      );

      return NextResponse.json({
        data: rows.map(row => ({
          fileId: row.FileID,
          documentTypeId: row.DocumentTypeID ?? null,
          documentTypeName: row.DocumentTypeName ?? null,
          url: resolveUrl(row.FilePath, Boolean(row.IsUrl)),
          isUrl: Boolean(row.IsUrl)
        }))
      });
    });
  },
  { bit: PERM.R }
);
