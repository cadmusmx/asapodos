import { NextResponse } from 'next/server'

import { withPermission, PERM } from '@gaso/shared'

import { withTenantContext } from '@/lib/tenant-context'
import { resolveAssignmentScope } from '@/lib/permissions/assignment-scope'

export const runtime = 'nodejs'

/**
 * GET /api/permissions/department/[id]/facets
 * Opciones de PUESTO para acotar el alcance del modal, DEPENDIENTES del departamento:
 * los distintos puestos presentes entre los usuarios ACTIVOS de ese depto.
 * Así cada opción corresponde a ≥1 usuario (sin selecciones vacías).
 *
 * Mismo gate de alcance que department/[id]/views:
 * - no listar facetas de un depto fuera del alcance del actor.
 * - permissions_access no aplica aquí (no hay vistas).
 *
 * NULL: usuarios con IdPuesto NULL NO producen opción — el filtro es "wildcard NULL", no "match NULL":
 *  no se puede targetear "sin puesto" (§ afectados).
 */
export const GET = withPermission(
  'permissions_access',
  async (_req, { auth, tenantId }, routeCtx: { params: Promise<{ id: string }> }) => {
    const { id } = await routeCtx.params
    const deptId = Number(id)

    if (!Number.isInteger(deptId)) {
      return NextResponse.json({ message: 'id de departamento inválido' }, { status: 400 })
    }

    try {
      const result = await withTenantContext(tenantId, async tx => {
        const scope = await resolveAssignmentScope(tx, tenantId, auth.userId)

        if (scope === null) {
          return { status: 403 as const }
        }

        if (!scope.hasFullScope && deptId !== scope.actorDept) {
          return { status: 403 as const }
        }

        // Puestos distintos entre activos del depto.
        // LEFT JOIN + fallback al id (coherente con departments).
        // IS NOT NULL: NULL no es targeteable.
        const puestos = await tx.$queryRaw<Array<{ IdPuesto: number; NombrePuesto: string | null }>>`
          SELECT DISTINCT e.PositionID AS IdPuesto, p.Name AS NombrePuesto
          FROM dbo.GASOCO_Cat_Usuarios u
          INNER JOIN HumanCapital.Employees e ON e.TenantID = u.TenantID AND e.EmployeeID = u.EmployeeID
          LEFT JOIN HumanCapital.Positions p ON p.TenantID = e.TenantID AND p.PositionID = e.PositionID
          WHERE u.TenantID = CAST(${tenantId} AS uniqueidentifier)
            AND u.Estatus = 'A'
            AND e.DepartmentID = ${deptId}
            AND e.PositionID IS NOT NULL
          ORDER BY p.Name
        `

        return { status: 200 as const, puestos }
      })

      if (result.status === 403) {
        return NextResponse.json({ message: 'Permiso denegado' }, { status: 403 })
      }

      return NextResponse.json(
        {
          idDepartamento: deptId,
          puestos: result.puestos.map(p => ({
            idPuesto: p.IdPuesto,
            nombre: p.NombrePuesto ?? String(p.IdPuesto)
          }))
        },
        { status: 200 }
      )
    } catch (e) {
      console.error('[PERMISSIONS_DEPT_FACETS_ERROR]', e instanceof Error ? { message: e.message } : e)

      return NextResponse.json({ message: 'Error al consultar facetas del departamento' }, { status: 500 })
    }
  },
  { bit: PERM.R }
)
