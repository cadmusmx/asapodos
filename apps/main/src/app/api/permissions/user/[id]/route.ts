import { NextResponse } from 'next/server';

import { Prisma } from '@prisma/client';

import { withPermission, PERM } from '@gaso/shared';
import { withTenantContext } from '@/lib/tenant-context';

export const runtime = 'nodejs';

type TargetRow = {
  IdDepartamento: number | null;
};

type AssignableViewRow = {
  ViewCode: string;
  Label: string;
  MenuGroup: string | null;
  CurrentMask: number | null;
  CeilingMask: number;
  PublicMask: number | null;
};

/**
 * GET /api/permissions/user/[id] — vistas asignables + estado, para UN usuario.
 *
 * Alimenta el detalle del maestro-detalle.
 * Para el usuario `id`, devuelve las vistas que su DEPARTAMENTO contempla (DepartmentViews = asignables), con:
 *   - currentMask: la máscara actual del usuario (UserViews) o 0 si no tiene.
 *   - ceilingMask: el techo del depto (hasta dónde se le puede asignar).
 *
 * Reglas (todas decididas en diseño):
 *   - RBAC puro: gate permissions_access:R. Alcance por AssignableDepartments (sin isAdmin).
 *   - Se VALIDA que el target esté en el alcance del actor (si no -> 403), para que no se puedan espiar permisos fuera de alcance cambiando el id en la URL.
 *   - Se OMITEN vistas sin techo (el depto no las contempla -> no asignables).
 *   - Se OMITEN vistas sin MARGEN asignable sobre el piso público:
 *       (ceiling & ~public) == 0  => todo lo que ofrece el techo ya lo da lo público => nada que asignar manualmente => se omite.
 *     Una vista pública R con techo CRUD SÍ aparece (hay W/U/D asignables por encima).
 *
 * Devuelve tres máscaras por vista para que el detalle pinte cada bit:
 *   - currentMask: CRUDO (solo UserViews) = lo asignado manualmente hoy (0 si nada).
 *   - ceilingMask: techo del depto = máximo asignable.
 *   - publicMask:  piso público (0 si privada) = bits que el usuario tiene "gratis" y que la asignación manual NO puede quitar (se pintan on-bloqueado).
 *
 * DepartmentViews/UserViews tienen RLS; aun así filtramos TenantID explícito.
 */
export const GET = withPermission(
  'permissions_access',
  async (_req, { auth, tenantId }, routeCtx: { params: Promise<{ id: string }> }) => {
    const { id } = await routeCtx.params;
    const targetId = Number(id);

    if (!Number.isInteger(targetId)) {
      return NextResponse.json({ message: 'id de usuario inválido' }, { status: 400 });
    }

    try {
      const result = await withTenantContext(tenantId, async tx => {
        // 1) Depto del ACTOR (para su alcance). Filtro TenantID obligatorio.
        const actorRows = await tx.$queryRaw<TargetRow[]>`
          SELECT IdDepartamento
          FROM dbo.GASOCO_Cat_Usuarios
          WHERE IdUsuario = ${auth.userId}
            AND TenantID = CAST(${tenantId} AS uniqueidentifier)
        `;

        const actorDept = actorRows[0]?.IdDepartamento ?? null;

        // Fail-closed: actor sin depto => sin alcance.
        if (actorDept === null) {
          return { status: 403 as const };
        }

        // 2) ¿Alcance total? depto del actor ∈ AssignableDepartments.
        const privRows = await tx.$queryRaw<Array<{ ok: number }>>`
          SELECT TOP 1 1 AS ok
          FROM Security.AssignableDepartments
          WHERE TenantID = CAST(${tenantId} AS uniqueidentifier)
            AND IdDepartamento = ${actorDept}
        `;
        const hasFullScope = privRows.length > 0;

        // 3) Depto del TARGET. Debe existir en el tenant.
        const targetRows = await tx.$queryRaw<TargetRow[]>`
          SELECT IdDepartamento
          FROM dbo.GASOCO_Cat_Usuarios
          WHERE IdUsuario = ${targetId}
            AND TenantID = CAST(${tenantId} AS uniqueidentifier)
        `;

        if (targetRows.length === 0) {
          return { status: 404 as const };
        }

        const targetDept = targetRows[0]?.IdDepartamento ?? null;

        // 4) Validación de alcance: si el actor no es full-scope, el target
        //    debe ser de su mismo departamento.
        if (!hasFullScope && targetDept !== actorDept) {
          return { status: 403 as const };
        }

        // Target sin depto => no tiene DepartmentViews => nada asignable.
        if (targetDept === null) {
          return { status: 200 as const, rows: [] as AssignableViewRow[] };
        }

        // 5) Vistas asignables del depto del target + máscara actual del target.
        //    - DepartmentViews = techo (solo las que el depto contempla).
        //    - LEFT JOIN UserViews del target = máscara actual (o NULL).
        //    - Security.Views para label/menuGroup; se omiten públicas (PublicMask IS NULL).
        const rows = await tx.$queryRaw<AssignableViewRow[]>`
          SELECT
            v.ViewCode,
            v.Label,
            v.MenuGroup,
            uv.PermMask AS CurrentMask,
            dv.PermMask AS CeilingMask,
            v.PublicMask AS PublicMask
          FROM Security.DepartmentViews dv
          JOIN Security.Views v
            ON v.ViewCode = dv.ViewCode
          LEFT JOIN Security.UserViews uv
            ON uv.TenantID = dv.TenantID
           AND uv.ViewCode = dv.ViewCode
           AND uv.IdUsuario = ${targetId}
          WHERE dv.TenantID = CAST(${tenantId} AS uniqueidentifier)
            AND dv.IdDepartamento = ${targetDept}
            AND (dv.PermMask & ~ISNULL(v.PublicMask, 0)) <> 0
          ORDER BY v.MenuGroup, v.ViewCode
        `;

        return { status: 200 as const, rows };
      });

      if (result.status === 403) {
        return NextResponse.json({ message: 'Permiso denegado' }, { status: 403 });
      }

      if (result.status === 404) {
        return NextResponse.json({ message: 'Usuario no encontrado' }, { status: 404 });
      }

      const data = result.rows.map(r => ({
        viewCode: r.ViewCode,
        label: r.Label,
        menuGroup: r.MenuGroup,
        currentMask: r.CurrentMask ?? 0, // crudo: solo UserViews (lo asignado manualmente)
        ceilingMask: r.CeilingMask, // techo del depto (máximo asignable)
        publicMask: r.PublicMask ?? 0 // piso público (0 = privada); bits "gratis" no quitables
      }));

      return NextResponse.json({ idUsuario: targetId, views: data }, { status: 200 });
    } catch (e) {
      console.error('[PERMISSIONS_USER_ERROR]', e instanceof Error ? { message: e.message } : e);

      return NextResponse.json({ message: 'Error al consultar permisos del usuario' }, { status: 500 });
    }
  },
  { bit: PERM.R }
);
