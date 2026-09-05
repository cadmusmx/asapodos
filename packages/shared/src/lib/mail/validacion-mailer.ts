// Envío del PDF de Validación de Material (VM) por correo. Arma asunto/HTML y la
// entrega del PDF (adjunto o enlace) y delega en `mailer-core`.
//
// Variante adjunto|enlace: el `delivery` decide. Si el líder aprueba el enlace
// (correo más rápido, sin generar PDF en el envío), el hook pasa { pdfUrl } en
// vez de { pdfBuffer } — sin tocar nada más aquí.

import { enviarCorreo, capitalize, type EnvioResultado } from './mailer-core'

// Subconjunto del registro (getVMDetail) que necesita el correo.
interface VMMailInfo {
  Folio: string
  ES: boolean | number
  FechaEdicion?: unknown
  IdSitio?: string
  NombreSitio?: string
  IdRegion?: number | string | null
  CuentaCliente?: string
}

// PDF como adjunto (buffer) o como enlace (url).
export type PdfDelivery = { pdfBuffer: Buffer } | { pdfUrl: string }

const LOG_TAG = '[VM correo]'

export async function enviarCorreoValidacion(
  vm: VMMailInfo,
  delivery: PdfDelivery,
  to: string[],
  cc?: string[],
): Promise<EnvioResultado> {
  const esEntrada = (vm.ES === true || vm.ES === 1)
  const tipoTxt = esEntrada ? 'Entrada' : 'Salida'
  const editado = !!vm.FechaEdicion
  const sitio = `${vm.IdSitio ?? ''} - ${vm.NombreSitio ?? ''}`.trim()
  const regionTxt = (vm.IdRegion != null && vm.IdRegion !== '') ? `${vm.IdRegion}` : '—'
  const esAdjunto = 'pdfBuffer' in delivery

  const detalle =
    `<ul>
       <li><strong>Sitio:</strong> ${sitio || '—'}</li>
       <li><strong>Cuenta cliente:</strong> ${vm.CuentaCliente ?? '—'}</li>
       <li><strong>Región:</strong> ${regionTxt}</li>
     </ul>`

  const intro = editado
    ? `La <strong>validación de material (${tipoTxt.toLowerCase()})</strong> con folio <strong>${vm.Folio}</strong> ha sido modificada.`
    : `Validación de material (<strong>${tipoTxt.toLowerCase()}</strong>) con folio <strong>${vm.Folio}</strong>.`

  const pdfLine = esAdjunto
    ? 'Adjunto el PDF con los datos.'
    : `Puedes ver el PDF en el siguiente enlace: <a href="${(delivery as { pdfUrl: string }).pdfUrl}">Ver PDF</a>`

  const html = `<p>${intro}</p><p>${pdfLine}</p>${detalle}`

  const filename = editado ? `${vm.Folio}-EDITADO.pdf` : `${vm.Folio}.pdf`

  return enviarCorreo({
    to,
    cc,
    subject: `${tipoTxt} • Región ${capitalize(regionTxt)}`,
    html,
    attachments: esAdjunto ? [{ filename, content: (delivery as { pdfBuffer: Buffer }).pdfBuffer }] : undefined,
    fromName: process.env.ZOHO_FROM_NAME || 'Validación de Material',
    logTag: LOG_TAG,
    logRef: vm.Folio,
  })
}
