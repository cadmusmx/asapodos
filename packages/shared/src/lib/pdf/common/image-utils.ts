// Utilidades compartidas por los prepare-data de PDF (VM y LM): descarga+
// compresión de imágenes S3 → base64, parseo tolerante de JSON, y helpers de
// tiempo/fecha. Portado verbatim del legacy.
//
// OJO sharp: urlToBase64 usa `sharp` (binario nativo). En Amplify/Lambda debe
// existir el binario para la arquitectura del runtime. Si el PDF falla al
// generar, es lo primero a revisar. Fallback sin sharp: devolver el base64 del
// buffer crudo sin resize (PDF más pesado, pero sin dependencia nativa).

import sharp from 'sharp'

/**
 * Descarga una imagen, la comprime con sharp y la devuelve como data-URI base64.
 * Devuelve null si falla la descarga o el procesamiento (nunca lanza).
 */
export async function urlToBase64(url: string): Promise<string | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)
    const response = await fetch(url, { signal: controller.signal })

    clearTimeout(timeout)
    if (!response.ok) return null

    const buffer = Buffer.from(await response.arrayBuffer())
    const compressed = await sharp(buffer)
      .resize(800, 600, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 60 })
      .toBuffer()

    return `data:image/jpeg;base64,${compressed.toString('base64')}`
  } catch {
    return null
  }
}

/**
 * Normaliza una firma/imagen ya en base64 (sin descarga) a data-URI. VM guarda
 * AspFirma como base64 PNG crudo; si ya viene con prefijo `data:`, se respeta.
 */
export function base64ToDataUrl(b64: unknown, mime = 'image/png'): string | null {
  if (!b64) return null

  const s = String(b64).trim()

  if (!s) return null

  return s.startsWith('data:') ? s : `data:${mime};base64,${s}`
}

// ¿La evidencia es un PDF? Misma heurística que el front.
export const esPdf = (ev: { mimeType?: string; archivo?: string } | null | undefined): boolean =>
  String(ev?.mimeType || '').toLowerCase().includes('pdf') ||
  String(ev?.archivo || '').toLowerCase().endsWith('.pdf')

// Parseo tolerante a arreglo (null | array | string JSON). Nunca lanza → [].
export function asList<T = unknown>(value: unknown): T[] {
  if (value == null) return []
  if (Array.isArray(value)) return value as T[]

  if (typeof value === 'string') {
    if (!value) return []

    try {
      const p = JSON.parse(value)

      return Array.isArray(p) ? (p as T[]) : []
    } catch {
      return []
    }
  }

  return []
}

// Parseo tolerante a objeto (null | objeto | string JSON). Útil para VM.Tarimas.
export function asObject(value: unknown): Record<string, string> {
  if (value == null) return {}
  if (typeof value === 'object' && !Array.isArray(value)) return value as Record<string, string>

  if (typeof value === 'string') {
    if (!value) return {}

    try {
      const p = JSON.parse(value)

      return (p && typeof p === 'object' && !Array.isArray(p)) ? (p as Record<string, string>) : {}
    } catch {
      return {}
    }
  }

  return {}
}

// "HH:mm:ss" | "HH:mm" -> "HH:mm"
export function hhmm(t: unknown): string {
  if (!t) return ''

  const s = String(t)

  return s.length >= 5 ? s.substring(0, 5) : s
}

export function toMinutes(t: unknown): number | null {
  if (!t) return null

  const [h, m] = String(t).split(':').map(Number)

  if (Number.isNaN(h) || Number.isNaN(m)) return null

  return h * 60 + m
}

// Diferencia legible entre dos horas; tolera cruce de medianoche.
export function diffHoras(ini: unknown, fin: unknown): string {
  const a = toMinutes(ini)
  const b = toMinutes(fin)

  if (a == null || b == null) return ''

  let d = b - a

  if (d < 0) d += 24 * 60

  const h = Math.floor(d / 60)
  const m = d % 60

  return `${h}h ${String(m).padStart(2, '0')}m`
}

// Formatea una fecha ISO/string a formato legible en español.
export function formatDate(value: unknown, withTime = false): string {
  if (!value) return ''

  try {
    const date = new Date(value as string)

    if (isNaN(date.getTime())) return String(value)

    const opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' }

    if (withTime) {
      opts.hour = '2-digit'
      opts.minute = '2-digit'
    }

    return date.toLocaleDateString('es-MX', opts)
  } catch {
    return String(value)
  }
}
