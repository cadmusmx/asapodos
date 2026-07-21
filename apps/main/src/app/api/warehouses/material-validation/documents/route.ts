import { NextResponse } from 'next/server';

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

import { withPermission, PERM } from '@gaso/shared';

import { getTenantSlugFromHeaders } from '@/lib/tenant-context';

const s3 = new S3Client({
  region: process.env.S3_REGION,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? '',
  },
});

const S3_BUCKET = process.env.S3_BUCKET ?? '';
const S3_PUBLIC_BASE_URL = process.env.S3_PUBLIC_BASE_URL ?? '';

const ALLOWED = ['.jpg', '.jpeg', '.png', '.pdf'];
const MAX_BYTES = 10 * 1024 * 1024;

export const POST = withPermission(
  'material_validation',
  async (req, { tenantId }) => {
    try {
      // Prefijo por tenant (D4); si faltara el slug, cae al GUID del tenant.
      const slug = getTenantSlugFromHeaders(req.headers) || tenantId;

      const form = await req.formData().catch(() => null);
      const file = form?.get('file');

      if (!(file instanceof File)) {
        return NextResponse.json({ message: 'No se recibió ningún archivo' }, { status: 400 });
      }

      const name = file.name ?? '';
      const dot = name.lastIndexOf('.');
      const ext = dot >= 0 ? name.slice(dot).toLowerCase() : '';

      if (!ALLOWED.includes(ext)) {
        return NextResponse.json({ message: 'Tipo de archivo no permitido. Solo JPG, PNG y PDF.' }, { status: 400 });
      }

      if (file.size > MAX_BYTES) {
        return NextResponse.json({ message: 'El archivo excede 10 MB' }, { status: 400 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const ts = new Date().toISOString().replace(/[:.]/g, '').slice(0, 15);
      const key = `${slug}/material_validation/docs/web/${ts}-web${ext}`;

      await s3.send(new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: file.type || 'application/octet-stream',
      }));

      const url = S3_PUBLIC_BASE_URL ? `${S3_PUBLIC_BASE_URL}/${key}` : key;

      return NextResponse.json({ success: true, key, url });
    } catch (e) {
      console.error('[material-validation/documents]', e);

      return NextResponse.json({ success: false, message: 'Error al subir el archivo' }, { status: 500 });
    }
  },
  { bit: PERM.U },
)
