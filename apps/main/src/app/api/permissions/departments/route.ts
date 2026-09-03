import { NextResponse } from 'next/server'

import { Prisma } from '@prisma/client'

import { withPermission, PERM } from '@gaso/shared'

import { withTenantContext } from '@/lib/tenant-context'
import { resolveAssignmentScope } from '@/lib/permissions/assignment-scope'

export const runtime = 'nodejs'

type DeptRow = {
  IdDepartamento: number
  NombreDepartamento: string | null
}

/**
 * GET /api/permissions/departments — departamentos filtrables (para el select del maestro)
 *
 * Alcance vía resolveAssignmentScope (punto único de verdad, compartido con
 * /users, /user/[id] y /presets/apply):
 *   - actor privilegiado (depto ∈ AssignableDepartments) -> todos los deptos con
 *     usuarios activos del tenant.
 *   - actor no privilegiado -> solo su propio departamento.
 *   - actor sin depto -> fail-closed (lista vacía, 200).
 *
 * Solo deptos CON usuarios activos (elegir uno vacío daría lista vacía).
 */
export const GET = withPermission(
  'permissions_access',
  async (_req, { auth, tenantId }) => {
    try {
      const result = await withTenantContext(tenantId, async tx => {
        // Alcance del actor. null => fail-closed => lista vacía.
        const scope = await resolveAssignmentScope(tx, tenantId, auth.userId)

        if (scope === null) {
          return [] as DeptRow[]
        }

        // Deptos DISTINTOS con al menos un usuario activo, dentro del alcance.
        const scopeCondition = scope.hasFullScope ? Prisma.sql`1 = 1` : Prisma.sql`e.DepartmentID = ${scope.actorDept}`

        const rows = await tx.$queryRaw<DeptRow[]>`
          SELECT DISTINCT e.DepartmentID AS IdDepartamento, d.Name AS NombreDepartamento
          FROM dbo.GASOCO_Cat_Usuarios u
          INNER JOIN HumanCapital.Employees e ON e.TenantID = u.TenantID AND e.EmployeeID = u.EmployeeID
          LEFT JOIN HumanCapital.Departments d ON d.TenantID = e.TenantID AND d.DepartmentID = e.DepartmentID
          WHERE u.TenantID = CAST(${tenantId} AS uniqueidentifier)
            AND u.Estatus = 'A'
            AND e.DepartmentID IS NOT NULL
            AND ${scopeCondition}
          ORDER BY d.Name
        `

        return rows
      })

      return NextResponse.json(
        {
          departments: result.map(r => ({
            idDepartamento: r.IdDepartamento,
            nombre: r.NombreDepartamento ?? String(r.IdDepartamento)
          }))
        },
        { status: 200 }
      )
    } catch (e) {
      console.error('[PERMISSIONS_DEPARTMENTS_ERROR]', e instanceof Error ? { message: e.message } : e)

      return NextResponse.json({ message: 'Error al listar departamentos' }, { status: 500 })
    }
  },
  { bit: PERM.R }
)
