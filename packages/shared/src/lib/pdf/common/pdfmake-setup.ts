// Setup único de pdfmake para el SaaS. A diferencia del legacy (paquete server
// `require('pdfmake')` con .ttf en disco), aquí se usa el bundle con vfs_fonts
// EMBEBIDO (Roboto base64) → sin archivos de fuente en el bundle.

import pdfMake from 'pdfmake/build/pdfmake'
import vfs from 'pdfmake/build/vfs_fonts'

import type { TDocumentDefinitions } from 'pdfmake/interfaces'

export async function renderToBuffer(docDefinition: TDocumentDefinitions): Promise<Buffer> {
  pdfMake.addVirtualFileSystem(vfs)
  return pdfMake.createPdf(docDefinition).getBuffer()
}

export { pdfMake }
