// Ruta B-LM (PDF por registro). GET → detalle reusable → PDF → Buffer inline.
// bit R. runtime nodejs (pdfmake + sharp).

import { NextResponse } from 'next/server'

import { withPermission } from '@gaso/shared'

import { renderLogisticaPdf } from '@gaso/shared/lib/pdf/logistica-pdf'

import { getLMDetail } from '../../_detail'

// Ajusta el path según dónde quedó el módulo pdf (no está en el barrel).

export const runtime = 'nodejs'

type RouteCtx = { params: Promise<{ folio: string }> }

export const GET = withPermission<RouteCtx>('material_logistics', async (_req, { tenantId }, routeCtx) => {
  try {
    const { folio } = await routeCtx.params

    if (!folio || !folio.trim()) {
      return NextResponse.json({ message: 'El folio es requerido' }, { status: 400 })
    }

    const record = await getLMDetail(tenantId, folio.trim())

    if (!record) return NextResponse.json({ message: 'Registro no encontrado' }, { status: 404 })

    const buffer = await renderLogisticaPdf(record)

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${record.Folio}.pdf"`,
      },
    })
  } catch (e) {
    console.error('[material-logistics/[folio]/pdf]', e)

    return NextResponse.json({ message: 'No se pudo generar el PDF' }, { status: 500 })
  }
})
