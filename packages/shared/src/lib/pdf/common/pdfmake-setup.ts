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
import vfs from 'pdfmake/build/vfs_fonts'

import type { TDocumentDefinitions } from 'pdfmake/interfaces'

/**
 * Genera el PDF y devuelve el Buffer. Envuelve el `getBuffer` (callback en el
 * bundle) en una Promise. Fuente por defecto Roboto (embebida en el vfs).
 */
export function renderToBuffer(docDefinition: TDocumentDefinitions): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      pdfMake.addVirtualFileSystem(vfs);

      const buffer = await pdfMake.createPdf(docDefinition).getBuffer()
      resolve(buffer)
    } catch (e) {
      reject(e)
    }
  })
}

export { pdfMake }
