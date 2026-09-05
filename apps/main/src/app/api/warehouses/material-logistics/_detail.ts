// Detalle LM reusable: misma llamada del route [folio] (usp_LM_GetByFolio, que ya
// resuelve la rama OutDerived: sitios propios UNION enlace + entregado/folioEntrega).
// Fuente única para el route de detalle, la generación de PDF, y el correo.

import type { LMDetailForPdf } from '@gaso/shared/lib/pdf/types'

import { withTenantContext } from '@/lib/tenant-context'
import { execSp, p, parseSitios } from './_shared'

// Ajusta el path según dónde quedó el módulo pdf (no está en el barrel).

export async function getLMDetail(
  tenantId: string,
  folio: string,
): Promise<(LMDetailForPdf & Record<string, unknown>) | null> {
  const rows = await withTenantContext(tenantId, tx =>
    tx.$queryRaw<Array<Record<string, unknown>>>(
      execSp('dbo.usp_LM_GetByFolio', [p('@TenantID', tenantId), p('@Folio', folio.trim())]),
    ),
  )

  if (rows.length === 0) return null

  const { Sitios, Documentos, Entregas, ...cabecera } = rows[0]

  return {
    ...cabecera,
    sitios: parseSitios(Sitios),
    documentos: parseSitios(Documentos),
    entregas: parseSitios(Entregas),
  } as unknown as LMDetailForPdf & Record<string, unknown>
}
