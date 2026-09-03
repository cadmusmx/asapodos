import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

const S3_BUCKET = process.env.S3_BUCKET ?? ''
const S3_PUBLIC_BASE_URL = process.env.S3_PUBLIC_BASE_URL ?? ''

const s3 = new S3Client({
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? ''
  }
})

export const LOGO_ALLOWED = ['.png', '.jpg', '.jpeg', '.svg', '.webp'] as const
export const FAVICON_ALLOWED = ['.png', '.ico', '.svg'] as const
export const LOGO_MAX_BYTES = 5 * 1024 * 1024
export const FAVICON_MAX_BYTES = 1 * 1024 * 1024

export type BrandingAssetKind = 'logo' | 'favicon'

const ALLOWED_BY_KIND: Record<BrandingAssetKind, readonly string[]> = {
  logo: LOGO_ALLOWED,
  favicon: FAVICON_ALLOWED
}

const MAX_BYTES_BY_KIND: Record<BrandingAssetKind, number> = {
  logo: LOGO_MAX_BYTES,
  favicon: FAVICON_MAX_BYTES
}

export class InvalidBrandingAssetError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidBrandingAssetError'
  }
}

export async function uploadBrandingAsset(
  tenantSlug: string,
  kind: BrandingAssetKind,
  file: File
): Promise<{ url: string }> {
  const allowed = ALLOWED_BY_KIND[kind]
  const maxBytes = MAX_BYTES_BY_KIND[kind]

  const name = file.name ?? ''
  const dot = name.lastIndexOf('.')
  const ext = dot >= 0 ? name.slice(dot).toLowerCase() : ''

  if (!allowed.includes(ext)) {
    const allowedList = allowed.join(', ')

    throw new InvalidBrandingAssetError(`Tipo de archivo no permitido para ${kind}. Solo se permiten: ${allowedList}.`)
  }

  if (file.size > maxBytes) {
    const mb = maxBytes / 1024 / 1024

    throw new InvalidBrandingAssetError(`El archivo excede ${mb} MB para ${kind}.`)
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const ts = new Date().toISOString().replace(/[:.]/g, '').slice(0, 15)
  const folder = S3_PUBLIC_BASE_URL && S3_PUBLIC_BASE_URL.includes('Qa') ? 'Qa/' : 'Pr/'
  const key = `${folder}${tenantSlug}/brand/${kind}/${ts}${ext}`

  await s3.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: file.type || 'application/octet-stream'
    })
  )

  const url = S3_PUBLIC_BASE_URL ? `${S3_PUBLIC_BASE_URL}${key}` : key

  return { url }
}
