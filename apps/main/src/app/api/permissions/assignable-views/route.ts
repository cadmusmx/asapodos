import { NextResponse } from 'next/server';

import { Prisma } from '@prisma/client';

import { withPermission, PERM, getEnabledMenuGroups } from '@gaso/shared';

import { withTenantContext } from '@/lib/tenant-context';

export const runtime = 'nodejs';

/**
 * GET /api/permissions/assignable-views — vistas asignables del TENANT (tenant-level).
 * Reemplaza department/[id]/views. Con Opción 2 no hay techo per-depto:
 * las vistas asignables son idénticas en todo el tenant, gobernadas por el PLAN (getEnabledMenuGroups).
 *   - ceilingMask fijo = 15 (full CRUD asignable dentro del plan; compat con mask-ui del modal).
 *   - Regla de margen: se omiten vistas sin nada asignable por encima del piso público.
 *   - permissions_access sale (read neutral); modal la oculta, apply la rechaza.
 * El gate permissions_access:R ya pasa por requirePermission, que aplica la compuerta de
 * plan sobre el ACTOR — si el plan no incluye 'administration', ni se llega aquí.
 */
export const GET = withPermission(
  'permissions_access',
  async (_req, { tenantId }) => {
    try {
      const rows = await withTenantContext(tenantId, async tx => {
        const enabled = await getEnabledMenuGroups(tx, tenantId);

        if (enabled.size === 0) {
          return [] as Array<{ ViewCode: string; Label: string; MenuGroup: string | null; PublicMask: number | null }>;
        }

        const menuGroups = Array.from(enabled);

        return tx.$queryRaw<Array<{ ViewCode: string; Label: string; MenuGroup: string | null; PublicMask: number | null }>>(
          Prisma.sql`
            SELECT v.ViewCode, v.Label, v.MenuGroup, v.PublicMask
            FROM Security.Views v
            WHERE v.MenuGroup IN (${Prisma.join(menuGroups)})
              AND (15 & ~ISNULL(v.PublicMask, 0)) <> 0
            ORDER BY v.MenuGroup, v.ViewCode
          `,
        );
      });

      return NextResponse.json(
        {
          views: rows.map(v => ({
            viewCode: v.ViewCode,
            label: v.Label,
            menuGroup: v.MenuGroup,
            ceilingMask: 15,
            publicMask: v.PublicMask ?? 0,
          })),
        },
        { status: 200 },
      );
    } catch (e) {
      console.error('[PERMISSIONS_ASSIGNABLE_VIEWS_ERROR]', e instanceof Error ? { message: e.message } : e);

      return NextResponse.json({ message: 'Error al listar vistas asignables' }, { status: 500 });
    }
  },
  { bit: PERM.R },
);
