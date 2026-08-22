import { NextResponse } from 'next/server';

import { withPermission } from '@gaso/shared';

import { withTenantContext } from '@/lib/tenant-context';

// Opciones para los selects del listado. GET -> bit R por default.
export interface EstatusOption { Id: number; Nombre: string };
export interface DepartamentoOption { Id: number; Nombre: string };
export interface ConductorOption { Id: number; Nombre: string };

export const GET = withPermission('vehicles', async (_req, { tenantId }) => {
  try {
    const data = await withTenantContext(tenantId, async tx => {
      // Secuencial a propósito: el tx interactivo de Prisma es una sola conexión.
      // DISTINCT sobre la flota: solo valores realmente presentes en vehículos del tenant.
      const estatuses = await tx.$queryRaw<EstatusOption[]>`
        SELECT DISTINCT es.idEstatus AS Id, es.nombreEstatus AS Nombre
        FROM Fleet.Vehicles v
        INNER JOIN dbo.cat_estatus es ON es.idEstatus = v.Estatus
        WHERE v.TenantID = CAST(${tenantId} AS uniqueidentifier)
        ORDER BY es.nombreEstatus`;

      const departamentos = await tx.$queryRaw<DepartamentoOption[]>`
        SELECT DISTINCT dep.DepartmentID AS Id, dep.Name AS Nombre
        FROM Fleet.Vehicles v
        INNER JOIN HumanCapital.Departments dep ON dep.TenantID = v.TenantID AND dep.DepartmentID = v.Departamento
        WHERE v.TenantID = CAST(${tenantId} AS uniqueidentifier)
        ORDER BY dep.Name`;

      // Hoy vacío: todos los ConductorEmployeeID son NULL hasta el Slice 2.
      const conductores = await tx.$queryRaw<ConductorOption[]>`
        SELECT DISTINCT emp.EmployeeID AS Id, LTRIM(RTRIM(emp.FirstName + ' ' + emp.LastName)) AS Nombre
        FROM Fleet.Vehicles v
        INNER JOIN HumanCapital.Employees emp ON emp.TenantID = v.TenantID AND emp.EmployeeID = v.ConductorEmployeeID
        WHERE v.TenantID = CAST(${tenantId} AS uniqueidentifier)
        ORDER BY LTRIM(RTRIM(emp.FirstName + ' ' + emp.LastName))`;

      return { estatuses, departamentos, conductores };
    });

    return NextResponse.json(data);
  } catch (e) {
    console.error('[vehicles/filters]', e);

    return NextResponse.json({ message: 'Ha ocurrido un error inesperado' }, { status: 500 });
  }
});
