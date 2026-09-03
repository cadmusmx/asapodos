// Base pública del bucket S3 para el browser (las llaves viven en BD).
const S3_BASE = process.env.NEXT_PUBLIC_S3_PUBLIC_BASE_URL ?? ''

/**
 * Resuelve la URL pública de un archivo almacenado (fotos, QR, documentos).
 *
 * - Si el valor ya es **absoluto** (`http(s)://`) se usa TAL CUAL — cubre los
 *   registros **migrados** del ERP legacy, cuyas keys son URLs de otro bucket.
 * - Si es una **key relativa** del bucket actual, se prefija el origen público.
 *
 * Normaliza el separador (sin duplicar `/`). Cadena vacía si no hay valor.
 * Único punto de verdad para el render de archivos en el browser (mv, lm, …).
 */
export const resolveAssetUrl = (value?: string | null): string => {
  const v = (value ?? '').trim()

  if (!v) return ''
  if (/^https?:\/\//i.test(v)) return v
  if (!S3_BASE) return v

  return `${S3_BASE.replace(/\/+$/, '')}/${v.replace(/^\/+/, '')}`
}
