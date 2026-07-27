import { NextResponse } from 'next/server';

import { Prisma } from '@prisma/client';

import { withPermission } from '@gaso/shared';

import { withTenantContext } from '@/lib/tenant-context';
import type { Sitio } from './_shared';
import { execSp, isMissing, p, validateSitio, checkSitiosDuplicados } from './_shared';

interface CreateBody {
  fecha?: string;
  idXdock?: number;
  nombreResponsable?: string;
  unidadPlaca?: string;
  nombreOperador?: string;
  horaLlegada?: string;
  horaInicioDescarga?: string;
  horaSalida?: string;
  confirmado?: boolean | string;
  re?: boolean | string;
  idCarrier?: number;
  otroCarrier?: string;
  sitios?: Sitio[];
}

// POST / — crear (bit W). IdUsuario y TenantID salen del token/contexto, NO del body.
// El carrier "Otro" se valida por EsOtro del catálogo (no por id 4).
export const POST = withPermission('material_logistics', async (req, { auth, tenantId }) => {
  try {
    const b = (await req.json().catch(() => null)) as CreateBody | null;

    if (!b) return NextResponse.json({ message: 'Cuerpo inválido' }, { status: 400 });

    // Requeridos de cabecera (IdUsuario ya no va aquí).
    const required = [
      b.fecha, b.idXdock, b.unidadPlaca, b.nombreOperador,
      b.horaLlegada, b.horaInicioDescarga, b.horaSalida, b.confirmado, b.re, b.idCarrier,
    ];

    if (required.some(isMissing)) return NextResponse.json({ message: 'Faltan datos' }, { status: 400 });

    // Al menos un sitio, y cada sitio válido.
    const sitios = Array.isArray(b.sitios) ? b.sitios : [];

    if (sitios.length === 0) return NextResponse.json({ message: 'Requiere al menos un sitio' }, { status: 400 });

    for (const s of sitios) {
      const err = validateSitio(s);

      if (err) return NextResponse.json({ message: err }, { status: 400 });
    }

    if (checkSitiosDuplicados(sitios)) {
      return NextResponse.json({ message: 'Hay sitios duplicados (idSitio + nombreSitio)' }, { status: 400 });
    }

    // Carrier "Otro": resolver por catálogo. Si EsOtro=1, otroCarrier es obligatorio.
    const esOtro = await withTenantContext(tenantId, async tx => {
      const r = await tx.$queryRaw<Array<{ EsOtro: boolean }>>`
        SELECT EsOtro FROM dbo.Cat_Carriers WHERE Id = ${b.idCarrier}`;

      return r[0]?.EsOtro ?? null;
    });

    if (esOtro === null) return NextResponse.json({ message: 'El carrier no existe' }, { status: 400 });

    if (esOtro && isMissing(b.otroCarrier)) {
      return NextResponse.json({ message: 'Falta el carrier (Otro)' }, { status: 400 });
    }

    // EXEC usp_LM_Create -> devuelve { Id, Folio }. El SP valida XDOCK del tenant.
    try {
      const params = [
        p('@TenantID', tenantId),
        p('@IdUsuario', auth.userId),
        p('@Fecha', b.fecha),
        p('@IdXdock', b.idXdock),
        p('@NombreResponsable', b.nombreResponsable ?? null),
        p('@UnidadPlaca', b.unidadPlaca),
        p('@NombreOperador', b.nombreOperador),
        p('@HoraLlegada', b.horaLlegada),
        p('@HoraInicioDescarga', b.horaInicioDescarga),
        p('@HoraSalida', b.horaSalida),
        p('@Confirmado', b.confirmado === true || b.confirmado === 'true' ? 1 : 0),
        p('@RE', b.re === true || b.re === 'true' ? 1 : 0),
        p('@IdCarrier', b.idCarrier),
        p('@OtroCarrier', esOtro ? b.otroCarrier : null),
        p('@Sitios', JSON.stringify(sitios)),
      ];

      const result = await withTenantContext(tenantId, tx =>
        tx.$queryRaw<Array<{ Id: number; Folio: string }>>(execSp('dbo.usp_LM_Create', params)),
      );

      const created = result[0];

      return NextResponse.json({ success: true, id: created?.Id, folio: created?.Folio }, { status: 201 });
    } catch (e) {
      return mapSpError(e);
    }
  } catch (e) {
    console.error('[material-logistics POST]', e);

    return NextResponse.json({ success: false, message: 'Ha ocurrido un error inesperado' }, { status: 500 });
  }
});

// Traduce los THROW de los SPs a HTTP. 50021/22/23 = validación (400).
function mapSpError(e: unknown): NextResponse {
  const msg = e instanceof Prisma.PrismaClientKnownRequestError || e instanceof Error ? e.message : String(e);

  if (msg.includes('50021')) return NextResponse.json({ message: 'El XDOCK no existe o no pertenece al tenant' }, { status: 400 });
  if (msg.includes('50022')) return NextResponse.json({ message: 'El carrier no existe' }, { status: 400 });
  if (msg.includes('50023')) return NextResponse.json({ message: 'Falta el carrier (Otro)' }, { status: 400 });

  // Violación de UNIQUE(TenantID, Folio) — colisión de folio (muy improbable, folio server-side).
  if (msg.includes('GASOAL_LM_UQ_Folio') || msg.includes('duplicate key')) {
    return NextResponse.json({ message: 'Folio duplicado, reintente' }, { status: 409 });
  }

  console.error('[material-logistics POST][sp]', msg);

  return NextResponse.json({ success: false, message: 'Ha ocurrido un error inesperado' }, { status: 500 });
}
