// Arma el view-model (DATOS, no HTML) del registro VM para buildValidacionPdf.
// Portado del legacy `validacion-pdf-helpers`, con una adaptación SaaS clave:
// las URLs se resuelven con `resolveFileUrl` (passthrough de absolutas) en vez
// del `s3BaseUrl + key` naíf → migración-safe (keys del ERP viejo ya absolutas).
//
// El registro de entrada es el que devuelve getVMDetail (detalle ya resuelto,
// incluida la rama OutDerived: piezas/tarimas heredadas de la entrada).

import { urlToBase64, base64ToDataUrl, asList, asObject, formatDate } from './common/image-utils'
import { resolveFileUrl } from '../export/url'

import type { ValidacionViewModel } from './validacion-builder'

interface Foto { dataUrl: string | null; url: string | null }

// Registro de detalle que consume el PDF (subconjunto de lo que devuelve getVMDetail).
export interface VMDetailForPdf {
  Folio: string
  ES: boolean | number
  Fecha: unknown
  Cancelada: boolean | number
  Proyecto?: string
  TipoMaterial?: string
  NombreSitio?: string
  IdSitio?: string
  CuentaCliente?: string
  IdRegion?: number | string | null
  IdCarrier?: number | string | null
  Carrier?: string
  OtroCarrier?: string | null
  AlmacenDestino?: string
  Responsable?: string
  Correo?: string
  AspNombre?: string
  NombreContacto?: string
  PlacasTransporte?: string
  TotalPiezas?: number | null
  NumTarimas?: number | null
  Notas?: string | null
  FechaCaptura?: unknown
  FechaEdicion?: unknown
  UsuarioEditor?: string | null
  TransporteFoto?: string | null
  PlacasFoto?: string | null
  MaterialEnTransporteFoto?: string | null
  MaterialDescargadoFoto?: string | null
  AspFirma?: string | null
  Tarimas?: unknown
  MaterialDocumentos?: unknown
  PiezasMotivo?: unknown
  PiezasEstadoF?: unknown
}

// Resuelve una foto (key S3 o URL absoluta) a { dataUrl base64, url }.
async function resolveFoto(key: string | null | undefined): Promise<Foto | null> {
  if (!key) return null

  const url = resolveFileUrl(key)
  const dataUrl = await urlToBase64(url)

  return { dataUrl, url }
}

// Agrupa el objeto Tarimas {tarima_N, papeleta_N} en pares ordenados con imágenes resueltas.
async function resolveTarimas(tarimasRaw: unknown, numTarimas: number | null | undefined) {
  const obj = asObject(tarimasRaw)
  const keys = Object.keys(obj)

  if (!keys.length) return []

  let n = Number(numTarimas) || 0

  if (!n) {
    for (const k of keys) {
      const m = /_(\d+)$/.exec(k)

      if (m) n = Math.max(n, Number(m[1]))
    }
  }

  const out: Array<{ orden: number; tarima: Foto | null; papeleta: Foto | null }> = []

  for (let i = 1; i <= n; i++) {
    const tKey = obj[`tarima_${i}`] || null
    const pKey = obj[`papeleta_${i}`] || null

    if (!tKey && !pKey) continue

    const [tarima, papeleta] = await Promise.all([resolveFoto(tKey), resolveFoto(pKey)])

    out.push({ orden: i, tarima, papeleta })
  }

  return out
}

// Piezas JSON [{id, cl, clt, pzs}] → { etiqueta, piezas }.
function normalizePiezas(raw: unknown): Array<{ etiqueta: string; piezas: string }> {
  return asList<{ cl?: unknown; clt?: string; pzs?: unknown }>(raw).map((p) => ({
    etiqueta: p.clt || String(p.cl ?? ''),
    piezas: p.pzs != null ? String(p.pzs) : '',
  }))
}

// Documentos [{name, file}] → { name, url }. `file` puede ser key o URL absoluta.
function normalizeDocumentos(raw: unknown): Array<{ name: string; url: string }> {
  return asList<{ name?: string; file?: string }>(raw)
    .filter((d) => d && d.file)
    .map((d) => ({ name: d.name || 'Documento', url: resolveFileUrl(d.file) }))
}

export async function prepareValidacionData(vm: VMDetailForPdf): Promise<ValidacionViewModel> {
  const esEntrada = (vm.ES === true || vm.ES === 1)

  // Fotos fijas (keys S3 → base64), en paralelo.
  const [transporte, placas, materialEnTransporte, materialDescargado] = await Promise.all([
    resolveFoto(vm.TransporteFoto),
    resolveFoto(vm.PlacasFoto),
    resolveFoto(vm.MaterialEnTransporteFoto),
    resolveFoto(vm.MaterialDescargadoFoto),
  ])

  const tarimas = await resolveTarimas(vm.Tarimas, vm.NumTarimas ?? null)

  return {
    folio: vm.Folio ?? '',
    tipoTxt: esEntrada ? 'Entrada' : 'Salida',
    fechaTxt: formatDate(vm.Fecha),
    cancelada: (vm.Cancelada === true || vm.Cancelada === 1),
    proyecto: vm.Proyecto ?? '',
    tipoMaterial: vm.TipoMaterial ?? '',
    idSitio: vm.IdSitio ?? '',
    nombreSitio: vm.NombreSitio ?? '',
    cuentaCliente: vm.CuentaCliente ?? '',
    regionTxt: (vm.IdRegion != null && vm.IdRegion !== '') ? `Región ${vm.IdRegion}` : '',
    carrierTxt: (Number(vm.IdCarrier) !== 4) ? (vm.Carrier || '') : (vm.OtroCarrier || ''),
    almacenDestino: vm.AlmacenDestino ?? '',
    responsable: vm.Responsable ?? '',
    correo: vm.Correo ?? '',
    placasTransporte: vm.PlacasTransporte ?? '',
    totalPiezas: (vm.TotalPiezas != null) ? String(vm.TotalPiezas) : '0',
    numTarimas: (vm.NumTarimas != null) ? String(vm.NumTarimas) : '0',
    fechaCapturaTxt: formatDate(vm.FechaCaptura, true),
    fechaEdicionTxt: vm.FechaEdicion ? formatDate(vm.FechaEdicion, true) : '',
    aspNombre: vm.AspNombre ?? '',
    nombreContacto: vm.NombreContacto ?? '',
    notas: vm.Notas || '',
    fotos: { transporte: transporte ?? undefined, placas: placas ?? undefined, materialEnTransporte: materialEnTransporte ?? undefined, materialDescargado: materialDescargado ?? undefined },
    firmaDataUrl: base64ToDataUrl(vm.AspFirma, 'image/png'),
    tarimas,
    documentos: normalizeDocumentos(vm.MaterialDocumentos),
    piezasMotivo: normalizePiezas(vm.PiezasMotivo),
    piezasEstadoF: normalizePiezas(vm.PiezasEstadoF),
  }
}
