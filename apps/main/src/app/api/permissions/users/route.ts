import { NextResponse } from 'next/server';

import { Prisma } from '@prisma/client';

import { withPermission, PERM } from '@gaso/shared';

import { withTenantContext } from '@/lib/tenant-context';
import { resolveAssignmentScope } from '@/lib/permissions/assignment-scope';

export const runtime = 'nodejs';

type UserRow = {
  IdUsuario: number;
  Nombre: string | null;
  IdDepartamento: number | null;
  Departamento: string | null;
  IdPuesto: number | null;
  Puesto: string | null;
};

/**
 * GET /api/permissions/users — usuarios administrables (Paso 7.1)
 *
 * Alcance vía resolveAssignmentScope (punto único de verdad, compartido con
 * /departments, /user/[id] y /presets/apply):
 *   - depto del actor ∈ AssignableDepartments -> todos los usuarios del tenant
 *   - si no                                    -> solo su mismo departamento
 *   - actor sin IdDepartamento                 -> fail-closed (lista vacía)
 *
 * Filtro OPCIONAL ?dept=X: acota a ese departamento. Sin él, devuelve todo el
 * alcance. Un ?dept fuera del alcance del actor se ignora de forma segura (no amplía).
 *
 * No excluye a nadie del alcance (ver != asignar). Incluye al actor.
 * GASOCO_Cat_Usuarios sin RLS -> filtro TenantID obligatorio.
 */
export const GET = withPermission(
  'permissions_access',
  async (req, { auth, tenantId }) => {
    const { searchParams } = new URL(req.url);

    const search = searchParams.get('search')?.trim() ?? '';
    const deptRaw = searchParams.get('dept');
    const deptFilter = deptRaw !== null && deptRaw !== '' ? Number(deptRaw) : null;
    const draw = Number(searchParams.get('draw') ?? '1');
    const pageSize = Math.min(Math.max(Number(searchParams.get('length') ?? '25'), 1), 100);
    const offset = Math.max(Number(searchParams.get('start') ?? '0'), 0);

    try {
      const result = await withTenantContext(tenantId, async tx => {
        // Alcance del actor. null => fail-closed => lista vacía.
        const scope = await resolveAssignmentScope(tx, tenantId, auth.userId);

        if (scope === null) {
          return { total: 0, rows: [] as UserRow[] };
        }

        // WHERE componible: tenant + activos + alcance + (filtro dept) + búsqueda.
        const conditions: Prisma.Sql[] = [
          Prisma.sql`u.TenantID = CAST(${tenantId} AS uniqueidentifier)`,
          Prisma.sql`u.Estatus = 'A'`
        ];

        // Alcance territorial base.
        if (!scope.hasFullScope) {
          conditions.push(Prisma.sql`e.DepartmentID = ${scope.actorDept}`);
        } else if (deptFilter !== null && Number.isInteger(deptFilter)) {
          conditions.push(Prisma.sql`e.DepartmentID = ${deptFilter}`);
        }

        // Privilegiado sin filtro: sin condición de depto.

        if (search) {
          const escaped = search.replace(/[|%_[]/g, c => `|${c}`);
          const pattern = `%${escaped}%`;

          conditions.push(Prisma.sql`(e.FirstName + ' ' + e.LastName) LIKE ${pattern} ESCAPE '|'`);
        }

        const whereClause = Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`;

        // Base común: Users (para IdUsuario + Estatus) ⋈ Employees (depto/puesto/nombre)
        const userBase = Prisma.sql`
          FROM dbo.GASOCO_Cat_Usuarios u
          INNER JOIN HumanCapital.Employees e ON e.TenantID = u.TenantID AND e.EmployeeID = u.EmployeeID`;

        const countResult = await tx.$queryRaw<Array<{ total: bigint }>>(
          Prisma.sql`SELECT COUNT(*) AS total ${userBase} ${whereClause}`
        );

        const total = Number(countResult[0]?.total ?? 0);

        const rows = await tx.$queryRaw<UserRow[]>(
          Prisma.sql`
            SELECT
              u.IdUsuario,
              LTRIM(RTRIM(e.FirstName + ' ' + e.LastName)) AS Nombre,
              e.DepartmentID AS IdDepartamento,
              dep.Name AS Departamento,
              e.PositionID AS IdPuesto,
              pue.Name AS Puesto
            ${userBase}
            LEFT JOIN HumanCapital.Departments dep ON dep.TenantID = e.TenantID AND dep.DepartmentID = e.DepartmentID
            LEFT JOIN HumanCapital.Positions pue ON pue.TenantID = e.TenantID AND pue.PositionID = e.PositionID
            ${whereClause}
            ORDER BY e.FirstName, e.LastName
            OFFSET ${offset} ROWS FETCH NEXT ${pageSize} ROWS ONLY
          `
        );

        return { total, rows };
      });

      const body = JSON.stringify(
        {
          draw,
          recordsTotal: result.total,
          recordsFiltered: result.total,
          data: result.rows.map(r => ({
            idUsuario: r.IdUsuario,
            nombre: r.Nombre ?? '',
            idDepartamento: r.IdDepartamento,
            departamento: r.Departamento ?? null,
            idPuesto: r.IdPuesto,
            puesto: r.Puesto ?? null
          }))
        },
        (_key, value) => (typeof value === 'bigint' ? Number(value) : value)
      );

      return new NextResponse(body, {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (e) {
      console.error('[PERMISSIONS_USERS_ERROR]', e instanceof Error ? { message: e.message } : e);

      return NextResponse.json({ message: 'Error al listar usuarios' }, { status: 500 });
    }
  },
  { bit: PERM.R }
);
