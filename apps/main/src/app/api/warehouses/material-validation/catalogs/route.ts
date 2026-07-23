import { NextResponse } from 'next/server';

import { withPermission } from '@gaso/shared';

import { withTenantContext } from '@/lib/tenant-context';

export interface AlmacenRow { Id: number; Nombre: string };
export interface ProyectoRow { Id: number; Proyecto: string };
export interface TipoMaterialRow { Id: number; Tipo: string };
export interface CarrierRow { Id: number; Carrier: string, EsOtro: boolean };
export interface MotivoRow { Id: number; Motivo: string };
export interface EstadoFisicoRow { Clave: string; Estado: string };

export const GET = withPermission('material_validation', async (_req, { tenantId }) => {
  try {
    const catalogs = await withTenantContext(tenantId, async tx => {
      // Secuencial a propósito: el tx interactivo de Prisma es una sola conexión;
      // Promise.all sobre el mismo `tx` no es seguro. Son 6 lecturas chicas.
      const almacenes = await tx.$queryRaw<AlmacenRow[]>`
        SELECT Id, Nombre FROM dbo.GASOAL_VMAlmacenes WHERE Activo = 1 ORDER BY Id ASC`;

      const proyectos = await tx.$queryRaw<ProyectoRow[]>`
        SELECT Id, Proyecto FROM dbo.Cat_VMProyecto WHERE Activo = 1 ORDER BY Id ASC`;

      const tiposMaterial = await tx.$queryRaw<TipoMaterialRow[]>`
        SELECT Id, Tipo FROM dbo.Cat_VMTiposMaterial WHERE Activo = 1 ORDER BY Id ASC`;

      const carriers = await tx.$queryRaw<CarrierRow[]>`
        SELECT Id, Carrier, EsOtro FROM dbo.Cat_Carriers ORDER BY Id ASC`;

      const motivos = await tx.$queryRaw<MotivoRow[]>`
        SELECT Id, Motivo FROM dbo.Cat_VMMotivo ORDER BY Id ASC`;

      const estadosFisicos = await tx.$queryRaw<EstadoFisicoRow[]>`
        SELECT Clave, Estado FROM dbo.Cat_VMEFisico ORDER BY Clave ASC`;

      return { almacenes, proyectos, tiposMaterial, carriers, motivos, estadosFisicos };
    })

    return NextResponse.json(catalogs);
  } catch (e) {
    // Errores RBAC (401/403) los traduce withPermission; aquí solo lo inesperado.
    console.error('[material-validation/catalogs]', e);

    return NextResponse.json({ message: 'Ha ocurrido un error inesperado' }, { status: 500 });
  }
});
