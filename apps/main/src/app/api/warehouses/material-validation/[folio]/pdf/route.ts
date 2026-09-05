// Ruta B (PDF por registro). GET → detalle reusable → PDF → Buffer inline.
// bit R (ver/descargar es lectura). runtime nodejs (pdfmake + sharp).

import { NextResponse } from 'next/server'

import { withPermission } from '@gaso/shared'

import { renderValidacionPdf } from '@gaso/shared/lib/pdf/validacion-pdf'

import { getVMDetail } from '../../_detail'

// Ajusta el path según dónde quedó el módulo pdf (no está en el barrel).

export const runtime = 'nodejs'

export const GET = withPermission('material_validation',
  async (req, { tenantId }, routeCtx: { params: Promise<{ folio: string }> }) => {
    try {
      const { folio } = await routeCtx.params

      const record = await getVMDetail(tenantId, folio)

      if (!record) return NextResponse.json({ message: 'Registro no encontrado' }, { status: 404 })

      const buffer = await renderValidacionPdf(record)

      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="${record.Folio}.pdf"`,
        },
      })
    } catch (e) {
      console.error('[material-validation/[folio]/pdf]', e)

      return NextResponse.json({ message: 'No se pudo generar el PDF' }, { status: 500 })
    }
  })
