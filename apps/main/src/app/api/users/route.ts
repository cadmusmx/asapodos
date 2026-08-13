import { NextResponse } from 'next/server';

import { Prisma } from '@prisma/client';

import { PERM, withPermission } from '@gaso/shared';

import { withTenantContext } from '@/lib/tenant-context';
import type { UserAccountRow } from '@/types/users';

export const runtime = 'nodejs';

const normalizeRow = (row: UserAccountRow) => {
  const firstName = row.FirstName ?? '';
  const lastName = row.LastName ?? '';

  return {
    employeeId: row.EmployeeID,
    employeeNumber: row.EmployeeNumber ?? null,
    fullName: `${firstName} ${lastName}`.trim(),
    positionName: row.PositionName ?? null,
    departmentName: row.DepartmentName ?? null,

    // Empleo (dominio RH) — solo-lectura aquí, señal independiente de la cuenta (D12):
    employmentStatus: row.EmploymentStatus ?? null,
    isActive: Boolean(row.IsActive),

    // Cuenta (dominio de este módulo):
    hasAccount: row.IdUsuario !== null,
    userId: row.IdUsuario ?? null,
    username: row.Usuario ?? null,
    accountStatus: row.Estatus ?? null // 'A' | 'I' | 'B' | null (sin cuenta)
  };
};

const getSearchPattern = (value: string | null): string | null => {
  if (!value) return null;

  const trimmed = value.trim();

  if (!trimmed) return null;

  const escaped = trimmed.replace(/[|%_[]/g, character => `|${character}`);

  return `%${escaped}%`;
};

/**
 * Fila cruda del listado de cuentas, ANCLADO en Employees (LEFT JOIN a Users):
 * mostramos a todo empleado, tenga o no cuenta. `IdUsuario` NULL = sin usuario.
 *
 * Inline por ahora (gate-first: es solo un read). Cuando Fase 2 agregue el alta,
 * extraemos tipo + normalize a `@/types/users` + `@/lib/users/normalize`, como
 * el playbook de employees.
 */
export const GET = withPermission(
  'users',
  async (req, { tenantId }) => {
    const { searchParams } = new URL(req.url);

    const search = getSearchPattern(searchParams.get('search'));

    const pageSize = Math.min(Math.max(Number(searchParams.get('pageSize') ?? '25'), 1), 100);
    const page = Math.max(Number(searchParams.get('page') ?? '1'), 1);
    const offset = (page - 1) * pageSize;

    return withTenantContext(tenantId, async tx => {
      const conditions: Prisma.Sql[] = [];

      // TenantID explícito además de RLS (defensa en profundidad).
      conditions.push(Prisma.sql`e.TenantID = CAST(${tenantId} AS uniqueidentifier)`);

      if (search) {
        conditions.push(
          Prisma.sql`(
            e.EmployeeNumber LIKE ${search} ESCAPE '|'
            OR e.FirstName LIKE ${search} ESCAPE '|'
            OR e.LastName LIKE ${search} ESCAPE '|'
            OR u.Usuario LIKE ${search} ESCAPE '|'
          )`
        );
      }

      const whereClause = Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`;

      const countRows = await tx.$queryRaw<Array<{ total: bigint }>>(
        Prisma.sql`
          SELECT COUNT_BIG(1) AS total
          FROM HumanCapital.Employees e
          LEFT JOIN dbo.GASOCO_Cat_Usuarios u
            ON u.TenantID = e.TenantID
            AND u.EmployeeID = e.EmployeeID
          ${whereClause}
        `
      );

      const rows = await tx.$queryRaw<UserAccountRow[]>(
        Prisma.sql`
          SELECT
            e.EmployeeID,
            e.EmployeeNumber,
            e.FirstName,
            e.LastName,
            e.EmploymentStatus,
            e.IsActive,
            d.Name AS DepartmentName,
            p.Name AS PositionName,
            u.IdUsuario,
            u.Usuario,
            u.Estatus
          FROM HumanCapital.Employees e
          LEFT JOIN dbo.GASOCO_Cat_Usuarios u
            ON u.TenantID = e.TenantID
            AND u.EmployeeID = e.EmployeeID
          LEFT JOIN HumanCapital.Departments d
            ON d.TenantID = e.TenantID
            AND d.DepartmentID = e.DepartmentID
          LEFT JOIN HumanCapital.Positions p
            ON p.TenantID = e.TenantID
            AND p.PositionID = e.PositionID
          ${whereClause}
          ORDER BY u.IdUsuario ASC, len(e.EmployeeNumber) ASC
          OFFSET ${offset} ROWS FETCH NEXT ${pageSize} ROWS ONLY
        `
      );

      return NextResponse.json({
        data: rows.map(normalizeRow),
        total: Number(countRows[0]?.total ?? 0),
        page,
        pageSize
      });
    });
  },
  { bit: PERM.R }
);
