import { NextResponse } from 'next/server';

import { Prisma } from '@prisma/client';

import { withPermission } from '@gaso/shared';

import type { Documento } from '../_shared';
import { isMissing, validateDocumentos } from '../_shared';
import { submitOut } from '../_out-service';

interface OutBody {
  folioIn?: string;
  sitios?: number[]; // GASOAL_LMSitios.Id (PK) pendientes seleccionados
  fecha?: string;
  nombreResponsable?: string;
  unidadPlaca?: string;
  nombreOperador?: string;
  horaLlegada?: string;
  horaInicioDescarga?: string;
  horaSalida?: string;
  confirmado?: boolean | string;
  documentos?: Documento[]; // merge final (heredados read-only + nuevos)
  // folioOut / qr: solo móvil (S5, QR directo). Web los omite → el SP genera el
  // folio LME- y hereda el Qr del IN.
  folioOut?: string;
  qr?: string;
}

// POST · crear entrega (OutDerived) a partir de una recepción. POST → bit W.
export const POST = withPermission('material_logistics', async (req, { auth, tenantId }) => {
  try {
    const b = (await req.json().catch(() => null)) as OutBody | null;

    if (!b) return NextResponse.json({ message: 'Cuerpo inválido' }, { status: 400 });

    // Requeridos de cabecera de entrega (confirmado admite false).
    const required = [
      b.folioIn,
      b.fecha,
      b.unidadPlaca,
      b.nombreOperador,
      b.horaLlegada,
      b.horaInicioDescarga,
      b.horaSalida,
      b.confirmado,
    ];

    if (required.some(isMissing)) {
      return NextResponse.json({ message: 'Faltan datos requeridos' }, { status: 400 });
    }

    // Al menos un sitio (el SP también lo valida con 50032, esto da mejor mensaje).
    const sitios = Array.isArray(b.sitios) ? b.sitios.filter((n): n is number => Number.isInteger(n)) : [];

    if (sitios.length === 0) {
      return NextResponse.json({ message: 'Selecciona al menos un sitio a entregar' }, { status: 400 });
    }

    // Documentos (opcional): validar solo si vienen.
    const documentos = Array.isArray(b.documentos) ? b.documentos : [];

    if (documentos.length) {
      const docErr = validateDocumentos(documentos);

      if (docErr) return NextResponse.json({ message: docErr }, { status: 400 });
    }

    if (isNaN(new Date(String(b.fecha)).getTime())) {
      return NextResponse.json({ message: 'Fecha inválida' }, { status: 400 });
    }

    const result = await submitOut({
      tenantId,
      userId: auth.userId,
      folioIn: b.folioIn as string,
      sitios,
      documentos,
      folioOut: b.folioOut,
      qr: b.qr,
      generales: {
        fecha: b.fecha as string,
        nombreResponsable: b.nombreResponsable ?? null,
        unidadPlaca: b.unidadPlaca as string,
        nombreOperador: b.nombreOperador as string,
        horaLlegada: b.horaLlegada as string,
        horaInicioDescarga: b.horaInicioDescarga as string,
        horaSalida: b.horaSalida as string,
        confirmado: b.confirmado === true || b.confirmado === 'true',
      },
    });

    return NextResponse.json({ success: true, idOut: result.idOut, folioOut: result.folioOut }, { status: 201 });
  } catch (e) {
    return mapSpError(e);
  }
});

// Traduce los THROW de usp_LM_CreateEntrega (y los UNIQUE de backstop) a HTTP.
function mapSpError(e: unknown): NextResponse {
  const msg =
    e instanceof Prisma.PrismaClientKnownRequestError || e instanceof Error ? e.message : String(e);

  if (msg.includes('50030')) {
    return NextResponse.json(
      { message: 'Uno o más sitios ya fueron entregados o no pertenecen a la recepción' },
      { status: 409 },
    );
  }

  if (msg.includes('50031')) {
    return NextResponse.json({ message: 'La recepción de origen no es válida' }, { status: 404 });
  }

  if (msg.includes('50032')) {
    return NextResponse.json({ message: 'Selecciona al menos un sitio a entregar' }, { status: 400 });
  }

  if (msg.includes('50033')) {
    return NextResponse.json({ message: 'El folio de entrega no es válido' }, { status: 400 });
  }

  if (msg.includes('50024')) {
    return NextResponse.json({ message: 'Documentos no es un JSON válido' }, { status: 400 });
  }

  if (msg.includes('50020')) {
    return NextResponse.json({ message: 'Contexto de tenant inválido' }, { status: 400 });
  }

  // Backstop de re-entrega concurrente (UNIQUE(IdSitio) de GASOAL_LMSitiosOut).
  if (msg.includes('GASOAL_LMSitiosOut') || /unique|duplicate key/i.test(msg)) {
    return NextResponse.json({ message: 'Uno o más sitios ya fueron entregados' }, { status: 409 });
  }

  console.error('[material-logistics/out][sp]', msg);

  return NextResponse.json({ success: false, message: 'Ha ocurrido un error inesperado' }, { status: 500 });
}
