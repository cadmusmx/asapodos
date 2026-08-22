import { NextResponse } from 'next/server';

import { withPermission } from '@gaso/shared';

import { withTenantContext } from '@/lib/tenant-context';

// Alimentador de selects del ALTA/EDICIÓN: catálogos COMPLETOS (no DISTINCT-de-flota como /filters).
// Globales dbo: todos. Per-tenant (aseguradoras/propietarios): solo activos. Departments: del tenant.
// Conductor NO va aquí: usa el Autocomplete contra /api/human-capital/employees.
export interface CatOption { Id: number; Nombre: string };

export const GET = withPermission('vehicles', async (_req, { tenantId }) => {
  try {
    const data = await withTenantContext(tenantId, async tx => {
      // Secuencial: el tx interactivo de Prisma es una sola conexión.
      const marcas = await tx.$queryRaw<CatOption[]>`
        SELECT IdMarca AS Id, Descripcion AS Nombre FROM dbo.Cat_MarcaAuto ORDER BY Descripcion`;

      const colores = await tx.$queryRaw<CatOption[]>`
        SELECT idColor AS Id, nombreColor AS Nombre FROM dbo.cat_color ORDER BY nombreColor`;

      const combustibles = await tx.$queryRaw<CatOption[]>`
        SELECT idCombustible AS Id, tipoCombustible AS Nombre FROM dbo.cat_combustible ORDER BY tipoCombustible`;

      const tiposVehiculo = await tx.$queryRaw<CatOption[]>`
        SELECT idTipoVehiculo AS Id, tipoVehiculo AS Nombre FROM dbo.cat_tipoVehiculo ORDER BY tipoVehiculo`;

      const estatuses = await tx.$queryRaw<CatOption[]>`
        SELECT idEstatus AS Id, nombreEstatus AS Nombre FROM dbo.cat_estatus ORDER BY nombreEstatus`;

      const estadosPlaca = await tx.$queryRaw<CatOption[]>`
        SELECT IdEstado AS Id, Nombre FROM dbo.Cat_Estados ORDER BY Nombre`;

      const aseguradoras = await tx.$queryRaw<CatOption[]>`
        SELECT IdEmpresa AS Id, Nombre FROM Fleet.EmpresasSeguros
        WHERE TenantID = CAST(${tenantId} AS uniqueidentifier) AND IsActive = 1 ORDER BY Nombre`;

      const propietarios = await tx.$queryRaw<CatOption[]>`
        SELECT IdPropietario AS Id, Nombre FROM Fleet.Propietarios
        WHERE TenantID = CAST(${tenantId} AS uniqueidentifier) AND IsActive = 1 ORDER BY Nombre`;

      const departamentos = await tx.$queryRaw<CatOption[]>`
        SELECT DepartmentID AS Id, Name AS Nombre FROM HumanCapital.Departments
        WHERE TenantID = CAST(${tenantId} AS uniqueidentifier) ORDER BY Name`;

      return { marcas, colores, combustibles, tiposVehiculo, estatuses, estadosPlaca, aseguradoras, propietarios, departamentos };
    });

    return NextResponse.json(data);
  } catch (e) {
    console.error('[fleets/vehicles/form-catalogs]', e);

    return NextResponse.json({ message: 'Ha ocurrido un error inesperado' }, { status: 500 });
  }
});
