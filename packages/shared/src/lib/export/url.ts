// Resuelve una key de archivo (S3) a URL pública, con PASSTHROUGH de URLs ya
// absolutas. Espejo backend del helper global del frontend.
//
// Post-migración del ERP viejo, las keys pasan a ser URLs absolutas (otro bucket):
// esas se devuelven tal cual. Las keys nativas del SaaS (que ya incluyen el dir de
// entorno `Qa/`|`Pr/`) se prefijan con la base del bucket.
//
// Base por defecto: S3_PUBLIC_BASE_URL (server). Pásala explícita si difiere.
// Úsalo en toda route que construya URLs desde keys (VM/LM export, y futuros).

export function resolveFileUrl(
  key: unknown,
  base: string = process.env.S3_PUBLIC_BASE_URL ?? '',
): string {
  const k = key == null ? '' : String(key);

  if (!k) return '';
  if (/^https?:\/\//i.test(k)) return k; // absoluta (migración / doc externo) → tal cual
  if (!base) return k;

  return `${base.replace(/\/+$/, '')}/${k.replace(/^\/+/, '')}`;
}
