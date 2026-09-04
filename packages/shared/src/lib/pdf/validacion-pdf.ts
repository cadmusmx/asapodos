// Composición: registro de detalle VM → Buffer PDF.
// Pura (no hace fetch del registro). La consumen la ruta B (descarga) y el correo de C.

import { renderToBuffer } from './common/pdfmake-setup'
import { buildValidacionPdf } from './validacion-builder'
import { prepareValidacionData } from './validacion-prepare'

import type { VMDetailForPdf } from './types'

export async function renderValidacionPdf(record: VMDetailForPdf): Promise<Buffer> {
  return renderToBuffer(buildValidacionPdf(await prepareValidacionData(record)))
}
