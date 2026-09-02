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

/**
 * Subida de archivos de Logística de Material (documentos de cabecera).
 *
 * Un solo core, dos gates de permiso según el flujo:
 *   - default            → bit U (edición de un registro existente).
 *   - ?flow=out          → bit W (alta de entrega / OutDerived).
 *
 * Form-data:
 *   - file  (requerido)  → jpg | jpeg | png | pdf, ≤ 10 MB.
 *   - name  (opcional)   → nombre semántico. Si viene, la key va a la carpeta por
 *                          usuario (como en la app); si no, se trata como documento
 *                          genérico y va a docs/web/.
 *
 * Respuesta: { success, key, url }. Se guarda la KEY; la url es solo para preview.
 * El cliente arma el Documento { nombre, archivo: key, mimeType }.
 */
async function coreHandler(
  req: Request,
  { auth, tenantId }: { auth: { userId: number }; tenantId: string },
) {
  try {
    const slug = getTenantSlugFromHeaders(req.headers) || tenantId;

    const form = await req.formData().catch(() => null);
    const file = form?.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ message: 'No se recibió ningún archivo' }, { status: 400 });
    }

    const fileName = file.name ?? '';
    const dot = fileName.lastIndexOf('.');
    const ext = dot >= 0 ? fileName.slice(dot).toLowerCase() : '';

    if (!ALLOWED.includes(ext)) {
      return NextResponse.json({ message: 'Tipo de archivo no permitido. Solo JPG, PNG y PDF.' }, { status: 400 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ message: 'El archivo excede 10 MB' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ts = new Date().toISOString().replace(/[:.]/g, '').slice(0, 15);
    const folder = `${process.env.S3_FOLDER ?? 'Pr'}/`;

    // Nombre semántico saneado (evita inyección de ruta).
    const safeName = ((form?.get('name') as string | null) ?? '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '');

    // Con nombre → carpeta por usuario (como la app):
    //   {folder}{slug}/material_logistics/{userId}/{name}_{ts}{ext}
    // Documento genérico (sin name) → docs/web/.
    const key = safeName
      ? `${folder}${slug}/material_logistics/${auth.userId}/${safeName}_${ts}${ext}`
      : `${folder}${slug}/material_logistics/docs/web/${ts}-web${ext}`;

    await s3.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: file.type || 'application/octet-stream',
      }),
    );

    const url = S3_PUBLIC_BASE_URL ? `${S3_PUBLIC_BASE_URL}${key}` : key;

    return NextResponse.json({ success: true, key, url });
  } catch (e) {
    console.error('[material-logistics/documents]', e);

    return NextResponse.json({ success: false, message: 'Error al subir el archivo' }, { status: 500 });
  }
}

// Mismo core, distinto gate. POST → W por default; con { bit: U } para edición.
const postWrite = withPermission('material_logistics', coreHandler);
const postUpdate = withPermission('material_logistics', coreHandler, { bit: PERM.U });

// ?flow=out → alta de entrega (W); si no, edición (U).
export const POST = (req: Request, ctx: unknown) => {
  const flow = new URL(req.url).searchParams.get('flow');

  return (flow === 'out' ? postWrite : postUpdate)(req, ctx);
};
