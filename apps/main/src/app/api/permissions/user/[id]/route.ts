import { NextResponse } from 'next/server';

import { Prisma } from '@prisma/client';

import { withPermission, PERM, getEnabledMenuGroups } from '@gaso/shared';

import { withTenantContext } from '@/lib/tenant-context';
import { resolveAssignmentScope } from '@/lib/permissions/assignment-scope';

export const runtime = 'nodejs';

type TargetRow = { IdDepartamento: number | null };

type AssignableViewRow = {
  ViewCode: string;
  Label: string;
  MenuGroup: string | null;
  CurrentMask: number | null;
  PublicMask: number | null;
};

/**
 * GET /api/permissions/user/[id] — vistas asignables + estado, para UN usuario.
 * Alimenta el detalle del maestro-detalle.
 *
 * Opción 2 (sin techo): las vistas asignables son las del PLAN del tenant
 * (getEnabledMenuGroups), idénticas para todos. Por usuario cambia solo el
 * currentMask (LEFT JOIN UserViews).
 *   - Gate permissions_access:R. Alcance del ACTOR vía resolveAssignmentScope.
 *   - Validación de alcance del actor sobre el target (targetDept): no espiar fuera de alcance.
 *   - ceilingMask fijo = 15 (full CRUD asignable; deprecado, compat mask-ui).
 *   - Regla de margen sobre público: se omiten vistas sin nada asignable por encima del público.
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
        const scope = await resolveAssignmentScope(tx, tenantId, auth.userId);

        if (scope === null) {
          return { status: 403 as const };
        }

        // Depto del TARGET: existencia + validación de alcance del actor.
        const targetRows = await tx.$queryRaw<TargetRow[]>`
          SELECT IdDepartamento
          FROM dbo.GASOCO_Cat_Usuarios
          WHERE IdUsuario = ${targetId} AND TenantID = CAST(${tenantId} AS uniqueidentifier)
        `;

        if (targetRows.length === 0) {
          return { status: 404 as const };
        }

        const targetDept = targetRows[0]?.IdDepartamento ?? null;

        if (!scope.hasFullScope && targetDept !== scope.actorDept) {
          return { status: 403 as const };
        }

        // Vistas asignables = las del PLAN (no del depto). currentMask del target.
        const enabled = await getEnabledMenuGroups(tx, tenantId);

        if (enabled.size === 0) {
          return { status: 200 as const, rows: [] as AssignableViewRow[] };
        }

        const menuGroups = Array.from(enabled);

        const rows = await tx.$queryRaw<AssignableViewRow[]>(
          Prisma.sql`
            SELECT
              v.ViewCode, v.Label, v.MenuGroup,
              uv.PermMask AS CurrentMask,
              v.PublicMask AS PublicMask
            FROM Security.Views v
            LEFT JOIN Security.UserViews uv
              ON uv.TenantID = CAST(${tenantId} AS uniqueidentifier)
             AND uv.ViewCode = v.ViewCode
             AND uv.IdUsuario = ${targetId}
            WHERE v.MenuGroup IN (${Prisma.join(menuGroups)})
              AND (15 & ~ISNULL(v.PublicMask, 0)) <> 0
            ORDER BY v.MenuGroup, v.ViewCode
          `,
        );

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
        currentMask: r.CurrentMask ?? 0,
        ceilingMask: 15,             // full CRUD asignable (sin techo; deprecado, compat mask-ui)
        publicMask: r.PublicMask ?? 0,
      }));

      return NextResponse.json({ idUsuario: targetId, views: data }, { status: 200 });
    } catch (e) {
      console.error('[PERMISSIONS_USER_ERROR]', e instanceof Error ? { message: e.message } : e);

      return NextResponse.json({ message: 'Error al consultar permisos del usuario' }, { status: 500 });
    }
  },
  { bit: PERM.R },
);
