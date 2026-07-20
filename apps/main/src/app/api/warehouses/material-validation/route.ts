import { NextResponse } from 'next/server';

import { withPermission } from '@gaso/shared';

import { withTenantContext } from '@/lib/tenant-context';
import type { Pieza } from './_shared';
import { isMissing, piezasValues } from './_shared';

interface CreateBody {
  es?: boolean | string;
  folio?: string;
  idProyecto?: number; idTipoMaterial?: number;
  nombreSitio?: string; idSitio?: string; cuentaCliente?: string;
  fecha?: string; aspNombre?: string; firmaBase64?: string; nombreContacto?: string;
  idCarrier?: number; carrier?: string; idRegion?: number; idAlmacenDestino?: number;
  totalPiezas?: number; placasTransporte?: string;
  fotoMaterialTransporte?: string; fotoDescargado?: string; fotoTransporte?: string; fotoPlacas?: string;
  notas?: string; qr?: string; numTarimas?: number; tarimas?: string; materialDocumentos?: string;
  piezasMotivo?: Pieza[]; piezasEstadoF?: Pieza[];
}

export const POST = withPermission('material_validation', async (req, { auth, tenantId }) => {
  try {
    const b = (await req.json().catch(() => null)) as CreateBody | null;

    if (!b) return NextResponse.json({ message: 'Cuerpo inválido' }, { status: 400 });

    const es = b.es === true || b.es === 'true';

    // Requeridos (equivalente al .some(isMissing) del legacy; IdUsuario ya no va aquí).
    const required = [
      b.es, b.folio, b.idProyecto, b.idTipoMaterial, b.nombreSitio, b.idSitio, b.cuentaCliente,
      b.fecha, b.aspNombre, b.nombreContacto, b.idCarrier, b.idRegion, b.idAlmacenDestino,
      b.placasTransporte, b.fotoTransporte, b.fotoPlacas, b.fotoMaterialTransporte, b.firmaBase64, b.qr,
    ];

    if (required.some(isMissing)) return NextResponse.json({ message: 'Faltan datos' }, { status: 400 });

    if (Number(b.idCarrier) === 4 && !b.carrier) {
      return NextResponse.json({ message: 'Falta el carrier' }, { status: 400 });
    }

    if (es && isMissing(b.fotoDescargado)) {
      return NextResponse.json({ message: 'Falta la foto del material descargado' }, { status: 400 });
    }

    const piezasMotivo = Array.isArray(b.piezasMotivo) ? b.piezasMotivo : [];
    const piezasEstadoF = Array.isArray(b.piezasEstadoF) ? b.piezasEstadoF : [];
    const tienePiezas = piezasMotivo.length > 0 || piezasEstadoF.length > 0;
    const tieneTarimas = !isMissing(b.numTarimas) && Number(b.numTarimas) > 0;
    const tieneDocumentos = !isMissing(b.materialDocumentos) && b.materialDocumentos !== '[]';

    if (!tienePiezas && !tieneTarimas && !tieneDocumentos) {
      return NextResponse.json({ message: 'Debe registrar al menos piezas, tarimas o documentos' }, { status: 400 });
    }

    if (tienePiezas && isMissing(b.totalPiezas)) {
      return NextResponse.json({ message: 'El total de piezas es obligatorio' }, { status: 400 });
    }

    const fecha = new Date(String(b.fecha));

    if (isNaN(fecha.getTime())) {
      return NextResponse.json({ message: 'Fecha inválida' }, { status: 400 });
    }

    const idVM = await withTenantContext(tenantId, async tx => {
      const inserted = await tx.$queryRaw<Array<{ Id: number }>>`
        INSERT INTO dbo.GASOAL_VMES
          (TenantID, IdUsuario, Folio, IdProyecto, IdTipoMaterial, NombreSitio, IdSitio, CuentaCliente,
           Fecha, AspNombre, AspFirma, NombreContacto, IdCarrier, OtroCarrier, IdRegion, IdAlmacenDestino,
           TotalPiezas, PlacasTransporte, MaterialEnTransporteFoto, MaterialDescargadoFoto, TransporteFoto,
           PlacasFoto, Notas, Qr, NumTarimas, Tarimas, MaterialDocumentos, ES)
        OUTPUT INSERTED.Id
        VALUES
          (${tenantId}, ${auth.userId}, ${b.folio}, ${b.idProyecto}, ${b.idTipoMaterial}, ${b.nombreSitio},
           ${b.idSitio}, ${b.cuentaCliente}, ${fecha}, ${b.aspNombre}, ${b.firmaBase64}, ${b.nombreContacto},
           ${b.idCarrier}, ${b.carrier ?? null}, ${b.idRegion}, ${b.idAlmacenDestino},
           ${b.totalPiezas ?? 0}, ${b.placasTransporte}, ${b.fotoMaterialTransporte}, ${b.fotoDescargado ?? null},
           ${b.fotoTransporte}, ${b.fotoPlacas}, ${b.notas ?? null}, ${b.qr}, ${b.numTarimas ?? 0},
           ${b.tarimas ?? null}, ${b.materialDocumentos ?? null}, ${es ? 1 : 0})
      `;

      const id = inserted[0].Id;

      // Piezas: (IdVM, Clave, Piezas). La columna ES se eliminó de las tablas de
      // piezas (era redundante; el ES real vive solo en la cabecera).
      if (piezasMotivo.length > 0) {
        await tx.$executeRaw`
          INSERT INTO dbo.GASOAL_VMPiezasMotivo (IdVM, Clave, Piezas)
          VALUES ${piezasValues(id, piezasMotivo, false)}`;
      }

      if (piezasEstadoF.length > 0) {
        await tx.$executeRaw`
          INSERT INTO dbo.GASOAL_VMPiezasEstadoF (IdVM, Clave, Piezas)
          VALUES ${piezasValues(id, piezasEstadoF, true)}`;
      }

      return id;
    })

    return NextResponse.json({ success: true, id: idVM });
  } catch (e) {
    const msg = String((e as Error)?.message ?? '');

    if (msg.includes('GASOAL_VMES_UQ_Folio') || (/unique/i.test(msg) && /folio/i.test(msg))) {
      return NextResponse.json({ message: 'El folio ya existe para este tenant' }, { status: 409 });
    }

    console.error('[material-validation/create]', e);

    return NextResponse.json({ success: false, message: 'Ha ocurrido un error inesperado' }, { status: 500 });
  }
})
