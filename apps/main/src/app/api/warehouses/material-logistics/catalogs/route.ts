import { NextResponse } from 'next/server'

import { withPermission } from '@gaso/shared'

import { withTenantContext } from '@/lib/tenant-context'

export interface XdockRow { Id: number; Nombre: string }
export interface TipoMaterialRow { Id: number; Nombre: string }
export interface TipoIncidenciaRow { Id: number; Nombre: string }
export interface TipoEvidenciaRow { Id: number; Nombre: string }
export interface CarrierRow { Id: number; Carrier: string; EsOtro: boolean }

// GET /catalogs — reemplaza los 5 GET legacy en una sola llamada (bit R).
// xdocks = propios del tenant + globales (NULL) vía RLS de fallback; el resto son catálogos globales puros.
// Carriers desde Cat_Carriers (compartida VM+LM);
export const GET = withPermission('material_logistics', async (_req, { tenantId }) => {
  try {
    const catalogs = await withTenantContext(tenantId, async tx => {
      // Secuencial a propósito: el tx interactivo es una sola conexión;
      // Promise.all sobre el mismo `tx` no es seguro. Son 5 lecturas chicas.
      const xdocks = await tx.$queryRaw<XdockRow[]>`
        SELECT Id, Nombre FROM dbo.Cat_LMXdocks WHERE Activo = 1 ORDER BY Nombre ASC`

      const tiposMaterial = await tx.$queryRaw<TipoMaterialRow[]>`
        SELECT Id, Nombre FROM dbo.Cat_LMTiposMaterial WHERE Activo = 1 ORDER BY Id ASC`

      const tiposIncidencia = await tx.$queryRaw<TipoIncidenciaRow[]>`
        SELECT Id, Nombre FROM dbo.Cat_LMTiposIncidencia WHERE Activo = 1 ORDER BY Id ASC`

      const tiposEvidencia = await tx.$queryRaw<TipoEvidenciaRow[]>`
        SELECT Id, Nombre FROM dbo.Cat_LMTiposEvidencia WHERE Activo = 1 ORDER BY Id ASC`

      const carriers = await tx.$queryRaw<CarrierRow[]>`
        SELECT Id, Carrier, EsOtro FROM dbo.Cat_Carriers ORDER BY Id ASC`

      return { xdocks, tiposMaterial, tiposIncidencia, tiposEvidencia, carriers }
    })

    return NextResponse.json(catalogs)
  } catch (e) {
    // withPermission traduce 401/403; aquí solo lo inesperado.
    console.error('[material-logistics/catalogs]', e)

    return NextResponse.json({ message: 'Ha ocurrido un error inesperado' }, { status: 500 })
  }
})
