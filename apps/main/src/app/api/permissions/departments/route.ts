import { NextResponse } from 'next/server';

import { Prisma } from '@prisma/client';

import { withPermission, PERM } from '@gaso/shared';
import { withTenantContext } from '@/lib/tenant-context';

export const runtime = 'nodejs';

type DeptRow = {
  IdDepartamento: number;
  NombreDepartamento: string | null;
};

/**
 * GET /api/permissions/departments — departamentos filtrables (para el select del maestro)
 *
 * Devuelve los departamentos que el actor puede administrar, para poblar el
 * filtro. Mismo modelo RBAC-puro que 7.1:
 *   - actor privilegiado (depto ∈ AssignableDepartments) -> todos los deptos con
 *     usuarios activos del tenant.
 *   - actor no privilegiado -> solo su propio departamento.
 *   - actor sin depto -> fail-closed (vacío).
 *
 * Solo deptos CON usuarios activos (elegir uno vacío daría lista vacía).
 * GASOCO_Cat_Usuarios sin RLS -> filtro TenantID obligatorio.
 */
export const GET = withPermission(
  'permissions_access',
  async (_req, { auth, tenantId }) => {
    try {
      const result = await withTenantContext(tenantId, async tx => {
        // Depto del actor + privilegio.
        const actorRows = await tx.$queryRaw<Array<{ IdDepartamento: number | null }>>`
          SELECT IdDepartamento
          FROM dbo.GASOCO_Cat_Usuarios
          WHERE IdUsuario = ${auth.userId}
            AND TenantID = CAST(${tenantId} AS uniqueidentifier)
        `;

        const actorDept = actorRows[0]?.IdDepartamento ?? null;

        if (actorDept === null) {
          return [] as DeptRow[];
        }

        const privRows = await tx.$queryRaw<Array<{ ok: number }>>`
          SELECT TOP 1 1 AS ok
          FROM Security.AssignableDepartments
          WHERE TenantID = CAST(${tenantId} AS uniqueidentifier)
            AND IdDepartamento = ${actorDept}
        `;
        const hasFullScope = privRows.length > 0;

        // Deptos DISTINTOS con al menos un usuario activo, dentro del alcance.
        const scopeCondition = hasFullScope
          ? Prisma.sql`1 = 1`
          : Prisma.sql`u.IdDepartamento = ${actorDept}`;

        const rows = await tx.$queryRaw<DeptRow[]>`
          SELECT DISTINCT u.IdDepartamento, d.NombreDepartamento
          FROM dbo.GASOCO_Cat_Usuarios u
          LEFT JOIN dbo.GASOCO_RH_Departamento d ON d.IdDepartamento = u.IdDepartamento
          WHERE u.TenantID = CAST(${tenantId} AS uniqueidentifier)
            AND u.Estatus = 'A'
            AND u.IdDepartamento IS NOT NULL
            AND ${scopeCondition}
          ORDER BY d.NombreDepartamento
        `;

        return rows;
      });

      return NextResponse.json(
        {
          departments: result.map(r => ({
            idDepartamento: r.IdDepartamento,
            nombre: r.NombreDepartamento ?? String(r.IdDepartamento)
          }))
        },
        { status: 200 }
      );
    } catch (e) {
      console.error('[PERMISSIONS_DEPARTMENTS_ERROR]', e instanceof Error ? { message: e.message } : e);

      return NextResponse.json({ message: 'Error al listar departamentos' }, { status: 500 });
    }
  },
  { bit: PERM.R }
);
