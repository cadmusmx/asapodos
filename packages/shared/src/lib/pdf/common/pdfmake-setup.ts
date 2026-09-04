// Setup único de pdfmake para el SaaS. A diferencia del legacy (paquete server
// `require('pdfmake')` con .ttf en disco), aquí se usa el bundle con vfs_fonts
// EMBEBIDO (Roboto base64) → sin archivos de fuente en el bundle.
//
// Requiere runtime Node (no edge). En Next puede necesitar declarar 'pdfmake'
// en serverExternalPackages si el bundler se queja.
//
// Fallback si el bundle diera guerra en Amplify: cambiar a `pdfmake` (paquete
// server) + setFonts a 4 Roboto-*.ttf empaquetados. Los builders NO cambian:
// solo consumen `renderToBuffer` de aquí.

import pdfMake from 'pdfmake/build/pdfmake'
import * as pdfFonts from 'pdfmake/build/vfs_fonts'

import type { TDocumentDefinitions } from 'pdfmake/interfaces'

// La forma del export de vfs_fonts varía por versión de pdfmake:
//   <0.2 : pdfFonts.pdfMake.vfs   ·   >=0.2 : pdfFonts.vfs (o el módulo mismo)
// Se cubren las variantes con un fallback encadenado.
/* eslint-disable @typescript-eslint/no-explicit-any */
const anyFonts = pdfFonts as any
const vfs = anyFonts?.pdfMake?.vfs ?? anyFonts?.vfs ?? anyFonts?.default?.vfs ?? anyFonts; (pdfMake as any).vfs = vfs

/**
 * Genera el PDF y devuelve el Buffer. Envuelve el `getBuffer` (callback en el
 * bundle) en una Promise. Fuente por defecto Roboto (embebida en el vfs).
 */
export function renderToBuffer(docDefinition: TDocumentDefinitions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      (pdfMake as any).createPdf(docDefinition).getBuffer((buf: Uint8Array) => {
        resolve(Buffer.from(buf))
      })
    } catch (e) {
      reject(e)
    }
  })
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export { pdfMake }
