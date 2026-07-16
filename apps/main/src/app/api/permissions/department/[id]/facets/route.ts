import { NextResponse } from 'next/server';

import { withPermission, PERM } from '@gaso/shared';

import { withTenantContext } from '@/lib/tenant-context';
import { resolveAssignmentScope } from '@/lib/permissions/assignment-scope';

export const runtime = 'nodejs';

/**
 * GET /api/permissions/department/[id]/facets
 * Opciones de PUESTO y PERFIL para acotar el alcance del modal, DEPENDIENTES del departamento:
 * los distintos puesto/perfil presentes entre los usuarios ACTIVOS de ese depto.
 * Así cada opción corresponde a ≥1 usuario (sin selecciones vacías).
 *
 * Mismo gate de alcance que department/[id]/views:
 * - no listar facetas de un depto fuera del alcance del actor.
 * - permissions_access no aplica aquí (no hay vistas).
 *
 * NULL: usuarios con IdPuesto/IdPerfil NULL NO producen opción — el filtro es "wildcard NULL", no "match NULL":
 *  no se puede targetear "sin puesto" (§ afectados).
 */
export const GET = withPermission(
  'permissions_access',
  async (_req, { auth, tenantId }, routeCtx: { params: Promise<{ id: string }> }) => {
    const { id } = await routeCtx.params;
    const deptId = Number(id);

    if (!Number.isInteger(deptId)) {
      return NextResponse.json({ message: 'id de departamento inválido' }, { status: 400 });
    }

    try {
      const result = await withTenantContext(tenantId, async tx => {
        const scope = await resolveAssignmentScope(tx, tenantId, auth.userId);

        if (scope === null) {
          return { status: 403 as const };
        }

        if (!scope.hasFullScope && deptId !== scope.actorDept) {
          return { status: 403 as const };
        }

        // Puestos distintos entre activos del depto.
        // LEFT JOIN + fallback al id (coherente con departments).
        // IS NOT NULL: NULL no es targeteable.
        const puestos = await tx.$queryRaw<Array<{ IdPuesto: number; NombrePuesto: string | null }>>`
          SELECT DISTINCT u.IdPuesto, pue.NombrePuesto
          FROM dbo.GASOCO_Cat_Usuarios u
          LEFT JOIN dbo.GASOCO_RH_Puesto pue ON pue.IdPuesto = u.IdPuesto
          WHERE u.TenantID = CAST(${tenantId} AS uniqueidentifier)
            AND u.Estatus = 'A'
            AND u.IdDepartamento = ${deptId}
            AND u.IdPuesto IS NOT NULL
          ORDER BY pue.NombrePuesto
        `;

        // Perfiles distintos.
        const perfiles = await tx.$queryRaw<Array<{ IdPerfil: number; Descripcion: string | null }>>`
          SELECT DISTINCT u.IdPerfil, per.Descripcion
          FROM dbo.GASOCO_Cat_Usuarios u
          LEFT JOIN dbo.GASOCO_Cat_Perfiles per ON per.Id = u.IdPerfil
          WHERE u.TenantID = CAST(${tenantId} AS uniqueidentifier)
            AND u.Estatus = 'A'
            AND u.IdDepartamento = ${deptId}
            AND u.IdPerfil IS NOT NULL
          ORDER BY per.Descripcion
        `;

        return { status: 200 as const, puestos, perfiles };
      });

      if (result.status === 403) {
        return NextResponse.json({ message: 'Permiso denegado' }, { status: 403 });
      }

      return NextResponse.json(
        {
          idDepartamento: deptId,
          puestos: result.puestos.map(p => ({
            idPuesto: p.IdPuesto,
            nombre: p.NombrePuesto ?? String(p.IdPuesto),
          })),
          perfiles: result.perfiles.map(p => ({
            idPerfil: p.IdPerfil,
            nombre: p.Descripcion ?? String(p.IdPerfil),
          })),
        },
        { status: 200 },
      );
    } catch (e) {
      console.error('[PERMISSIONS_DEPT_FACETS_ERROR]', e instanceof Error ? { message: e.message } : e);

      return NextResponse.json({ message: 'Error al consultar facetas del departamento' }, { status: 500 });
    }
  },
  { bit: PERM.R },
);
