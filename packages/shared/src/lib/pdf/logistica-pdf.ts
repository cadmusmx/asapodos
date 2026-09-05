// Composición: registro de detalle LM → Buffer PDF. Pura (no hace fetch).
// La consumen la ruta B-LM (descarga) y el correo de C-LM.

import { renderToBuffer } from './common/pdfmake-setup'
import { buildLogisticaPdf } from './logistica-builder'
import { prepareLogisticaData } from './logistica-prepare'

import type { LMDetailForPdf } from './types'

export async function renderLogisticaPdf(record: LMDetailForPdf): Promise<Buffer> {
  return renderToBuffer(buildLogisticaPdf(await prepareLogisticaData(record)))
}