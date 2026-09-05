// View-model (DATOS, no HTML) del registro LM para buildLogisticaPdf. Portado del
// legacy `logistica-pdf-helpers`, con la adaptación SaaS: URLs por `resolveFileUrl`
// (passthrough de absolutas → migración-safe) y carrier por `EsOtro` (como el
// detalle SaaS) en vez del `IdCarrier === 4` del legacy.
//
// Entrada: registro de getLMDetail (cabecera + `sitios[]` ya parseado; el SP ya
// resuelve la rama OutDerived: sitios propios UNION enlace).

import { urlToBase64, esPdf, asList, hhmm, diffHoras, formatDate } from './common/image-utils'
import { resolveFileUrl } from '../export/url'

import type { LMDetailForPdf, LMSitioRaw, LogisticaViewModel, SitioVM } from './types'

// Evidencias: imágenes → base64 (url de respaldo) PDFs → enlace.
async function resolveEvidencias(evidencias: NonNullable<LMSitioRaw['evidencias']>): Promise<SitioVM['evidencias']> {
  const imgs = evidencias.filter(ev => !esPdf(ev))
  const pdfs = evidencias.filter(ev => esPdf(ev))

  const base64s = await Promise.all(imgs.map(ev => urlToBase64(resolveFileUrl(ev.archivo))))

  const imagenes = imgs.map((ev, i) => ({
    tipo: ev.tipo || 'Evidencia',
    dataUrl: base64s[i] || null,
    url: resolveFileUrl(ev.archivo),
  }))

  const documentos = pdfs.map(ev => ({
    tipo: ev.tipo || 'Documento',
    url: resolveFileUrl(ev.archivo),
  }))

  return { imagenes, documentos }
}

// Tarimas: pares de imágenes base64 (url de respaldo por foto).
async function resolveTarimas(tarimas: NonNullable<LMSitioRaw['tarimas']>): Promise<SitioVM['tarimas']> {
  const out: SitioVM['tarimas'] = []
  let idx = 0

  for (const t of tarimas) {
    idx++

    const [tb64, pb64] = await Promise.all([
      t.tarimaFoto ? urlToBase64(resolveFileUrl(t.tarimaFoto)) : Promise.resolve(null),
      t.papeletaFoto ? urlToBase64(resolveFileUrl(t.papeletaFoto)) : Promise.resolve(null),
    ])

    out.push({
      orden: t.orden || idx,
      tarima: t.tarimaFoto ? { dataUrl: tb64, url: resolveFileUrl(t.tarimaFoto) } : null,
      papeleta: t.papeletaFoto ? { dataUrl: pb64, url: resolveFileUrl(t.papeletaFoto) } : null,
    })
  }

  return out
}

export async function prepareLogisticaData(lm: LMDetailForPdf): Promise<LogisticaViewModel> {
  const sitiosRaw = asList<LMSitioRaw>(lm.sitios)

  const cabecera = {
    folio: lm.Folio ?? '',
    tipoTxt: (lm.RE === true || lm.RE === 1) ? 'Recepción' : 'Entrega',
    fechaTxt: formatDate(lm.Fecha),
    xdock: lm.Xdock ?? '',
    carrierTxt: (lm.EsOtro === true || lm.EsOtro === 1) ? (lm.OtroCarrier || '') : (lm.Carrier || ''),
    responsable: lm.Responsable ?? '',
    correo: lm.Correo ?? '',
    unidadPlaca: lm.UnidadPlaca ?? '',
    nombreOperador: lm.NombreOperador ?? '',
    fechaCreacionTxt: formatDate(lm.FechaCreacion, true),
    fechaEdicionTxt: lm.FechaEdicion ? formatDate(lm.FechaEdicion, true) : '',
    llegadaTxt: hhmm(lm.HoraLlegada),
    inicioDescargaTxt: hhmm(lm.HoraInicioDescarga),
    salidaTxt: hhmm(lm.HoraSalida),
    estadiaTxt: diffHoras(lm.HoraLlegada, lm.HoraSalida),
    descargaTxt: diffHoras(lm.HoraInicioDescarga, lm.HoraSalida),
  }

  const sitios: SitioVM[] = []

  // Secuencial por sitio (cada sitio paraleliza sus fotos): evita saturar S3 con
  // demasiadas descargas concurrentes en arribos con muchos sitios.
  for (const s of sitiosRaw) {
    const faltante = (s.materialFaltante === true || s.materialFaltante === 1)
    const incidencias = asList<{ tipo?: string }>(s.incidencias)

    sitios.push({
      titulo: `${s.idSitio ?? ''} - ${s.nombreSitio ?? ''}`,
      faltante,
      tiposMaterialTxt: asList<{ tipo?: string }>(s.tiposMaterial).map(t => t.tipo).filter(Boolean) as string[],
      descripcionMaterial: s.descripcionMaterial || '',
      descripcionFaltantes: faltante ? (s.descripcionFaltantes || '') : '',
      incidenciasTxt: incidencias.map(i => i.tipo).filter(Boolean) as string[],
      descripcionIncidencias: incidencias.length ? (s.descripcionIncidencias || '') : '',
      evidencias: await resolveEvidencias(asList(s.evidencias)),
      tarimas: await resolveTarimas(asList(s.tarimas)),
    })
  }

  return { ...cabecera, sitios }
}
