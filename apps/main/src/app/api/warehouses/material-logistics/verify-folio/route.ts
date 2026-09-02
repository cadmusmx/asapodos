import { NextResponse } from 'next/server';

import { withPermission } from '@gaso/shared';

import { verifyFolioIn } from '../_out-service';

// GET · verificar folio de recepción para generar una entrega (OutDerived).
// GET → bit R por default. Devuelve 200 + { reason } SIEMPRE
// (VALID | ALL_DELIVERED | NOT_FOUND | NOT_IN); el cliente ramifica por reason
// para la mensajería del modal. 400 solo si falta el folio.
export const GET = withPermission('material_logistics', async (req, { tenantId }) => {
  try {
    const raw = new URL(req.url).searchParams.get('folio')?.trim();

    if (!raw) {
      return NextResponse.json({ message: 'El folio es requerido' }, { status: 400 });
    }

    const result = await verifyFolioIn(tenantId, raw);

    return NextResponse.json({ success: true, ...result });
  } catch (e) {
    console.error('[material-logistics/verify-folio]', e);

    return NextResponse.json({ success: false, message: 'Error al verificar el folio' }, { status: 500 });
  }
});
