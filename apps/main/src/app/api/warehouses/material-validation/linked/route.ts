import { NextResponse } from 'next/server';

import { withPermission } from '@gaso/shared';

import { withTenantContext } from '@/lib/tenant-context';

// Validación de Material - ¿el folio está vinculado? (bit R por default de GET).
export const GET = withPermission('material_validation', async (req, { tenantId }) => {
  try {
    const folio = new URL(req.url).searchParams.get('folio')?.trim();

    if (!folio) {
      return NextResponse.json({ message: 'El folio es requerido' }, { status: 400 });
    }

    const rows = await withTenantContext(tenantId, tx =>
      tx.$queryRaw<Array<{ count: number | bigint }>>`
        SELECT COUNT(*) AS count
        FROM dbo.GASOAL_VinculosFolioValidacion
        WHERE TenantID = ${tenantId}
          AND (FolioEntrada = ${folio} OR FolioSalida = ${folio} OR FolioValidacion = ${folio})
      `,
    );

    const vinculado = Number(rows[0]?.count ?? 0) > 0;

    return NextResponse.json({ success: true, vinculado });
  } catch (e) {
    console.error('[material-validation/linked]', e);

    return NextResponse.json({ success: false, message: 'Error al verificar el folio' }, { status: 500 });
  }
})
