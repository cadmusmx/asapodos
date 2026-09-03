import { NextResponse } from 'next/server'

import { withPermission } from '@gaso/shared'

import { isMissing } from '../_shared'
import { submitOut } from '../_out-service'

interface OutBody {
  folioIn?: string
  folioOut?: string
  qr?: string
  fecha?: string
  aspNombre?: string
  firmaBase64?: string
  nombreContacto?: string
  placasTransporte?: string
  fotoMaterialTransporte?: string
  fotoTransporte?: string
  fotoPlacas?: string
  notas?: string
  materialDocumentos?: string // JSON final: docs del IN + nuevos (opcional)
}

// POST · crear OutDerived (salida a partir de un IN). POST → bit W por default.
// ?directQR=true → el cliente envía su propia key de QR de salida (b.qr)
// si no viene, el OUT hereda el QR del IN (src.Qr).
export const POST = withPermission('material_validation', async (req, { auth, tenantId }) => {
  try {
    const directQR = new URL(req.url).searchParams.get('directQR') === 'true'

    const b = (await req.json().catch(() => null)) as OutBody | null

    if (!b) return NextResponse.json({ message: 'Cuerpo inválido' }, { status: 400 })

    // Requeridos: folio IN + datos generales capturados. folioOut es opcional
    // (si no viene, el server lo genera con QR heredado). El material NO se envía
    // (se hereda del IN en el servicio). Piezas tampoco (se heredan).
    const required = [
      b.folioIn, b.fecha, b.aspNombre, b.firmaBase64, b.nombreContacto,
      b.placasTransporte, b.fotoMaterialTransporte, b.fotoTransporte, b.fotoPlacas,
    ]

    if (required.some(isMissing)) return NextResponse.json({ message: 'Faltan datos' }, { status: 400 })

    if (directQR && isMissing(b.qr)) {
      return NextResponse.json({ message: 'Falta la key del QR de salida' }, { status: 400 })
    }

    const fecha = new Date(String(b.fecha))

    if (isNaN(fecha.getTime())) {
      return NextResponse.json({ message: 'Fecha inválida' }, { status: 400 })
    }

    const result = await submitOut({
      tenantId,
      userId: auth.userId,
      folioIn: b.folioIn!,
      folioOut: b.folioOut, // opcional: el server lo genera si no viene
      directQR,
      qr: b.qr ?? null,
      materialDocumentos: b.materialDocumentos,
      generales: {
        fecha: b.fecha!,
        aspNombre: b.aspNombre!,
        firmaBase64: b.firmaBase64!,
        nombreContacto: b.nombreContacto!,
        placasTransporte: b.placasTransporte!,
        fotoMaterialTransporte: b.fotoMaterialTransporte!,
        fotoTransporte: b.fotoTransporte!,
        fotoPlacas: b.fotoPlacas!,
        notas: b.notas ?? null,
      },
    })

    if (!result.ok) {
      // El folio IN no existe o no es IN del tenant (p.ej. se canceló entre verify y submit).
      return NextResponse.json({ message: 'El folio IN no es válido' }, { status: 404 })
    }

    return NextResponse.json({ success: true, idOut: result.idOut, folioOut: result.folioOut })
  } catch (e) {
    const msg = String((e as Error)?.message ?? '')

    // OUT duplicado del mismo IN (extendido en paralelo) → candado UNIQUE de VMOut.
    if (msg.includes('GASOAL_VMOut_UQ_FolioIN')) {
      return NextResponse.json({ message: 'Este folio IN ya tiene una salida' }, { status: 409 })
    }

    // Folio OUT colisiona (raro) → UNIQUE de VMES.
    if (msg.includes('GASOAL_VMES_UQ_Folio') || (/unique/i.test(msg) && /folio/i.test(msg))) {
      return NextResponse.json({ message: 'El folio de salida ya existe para este tenant' }, { status: 409 })
    }

    console.error('[material-validation/out]', e)

    return NextResponse.json({ success: false, message: 'Ha ocurrido un error inesperado' }, { status: 500 })
  }
})
