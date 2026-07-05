import type { Prisma } from '@prisma/client';

/**
 * RBAC · Motor de resolución
 *
 * Devuelve el set de vistas efectivas de un usuario en su tenant, como la UNIÓN de:
 *   (A) Otorgadas:  maskEfectiva = UserViews.PermMask & DepartmentViews.PermMask  (!= 0)
 *   (B) Públicas:   Security.Views.PublicMask (no NULL) — todos la reciben sin grant.
 * Ambas sujetas a disponibilidad (TenantViews, decisión A). Si una vista cae en (A) y
 * (B), el mask final es el OR (la pública es un piso; el grant puede sumar por encima).
 *
 * Invariantes (sin cambios): INNER JOIN en (A) = fail-closed; IdDepartamento en vivo;
 * GASOCO_Cat_Usuarios SIN RLS -> filtro por tenant obligatorio; $queryRaw parametrizado
 * sobre el `tx` cuyo SESSION_CONTEXT ya fijó el llamador.
 */

export interface ResolvedView {
  viewCode: string;
  label: string;
  menuGroup: string | null;
  /** maskEfectiva canónica != 0. */
  mask: number;
}

interface RawResolvedView {
  ViewCode: string;
  Label: string;
  MenuGroup: string | null;
  EffectiveMask: number;
}

export async function resolveUserViews(
  tx: Prisma.TransactionClient,
  params: { tenantId: string; idUsuario: number }
): Promise<ResolvedView[]> {
  const tenantId = params.tenantId.toLowerCase();
  const { idUsuario } = params;

  const rows = await tx.$queryRaw<RawResolvedView[]>`
    -- (A) otorgadas: UserViews & DepartmentViews, capadas por techo, disponibles
    SELECT v.ViewCode, v.Label, v.MenuGroup,
           (uv.PermMask & dv.PermMask) AS EffectiveMask
    FROM dbo.GASOCO_Cat_Usuarios u
    JOIN Security.UserViews uv
           ON uv.TenantID  = u.TenantID
          AND uv.IdUsuario = u.IdUsuario
    JOIN Security.DepartmentViews dv
           ON dv.TenantID       = u.TenantID
          AND dv.IdDepartamento = u.IdDepartamento
          AND dv.ViewCode       = uv.ViewCode
    JOIN Security.Views v
           ON v.ViewCode = uv.ViewCode
    WHERE u.IdUsuario = ${idUsuario}
      AND u.TenantID  = CAST(${tenantId} AS uniqueidentifier)
      AND (uv.PermMask & dv.PermMask) <> 0
      AND (
            NOT EXISTS (SELECT 1 FROM Security.TenantViews tv WHERE tv.ViewCode = uv.ViewCode)
            OR EXISTS  (SELECT 1 FROM Security.TenantViews tv
                         WHERE tv.ViewCode = uv.ViewCode
                           AND tv.TenantID = CAST(${tenantId} AS uniqueidentifier))
          )

    UNION ALL

    -- (B) públicas: PublicMask para todos, sujetas a disponibilidad del tenant
    SELECT v.ViewCode, v.Label, v.MenuGroup,
           v.PublicMask AS EffectiveMask
    FROM Security.Views v
    WHERE v.PublicMask IS NOT NULL
      AND (
            NOT EXISTS (SELECT 1 FROM Security.TenantViews tv WHERE tv.ViewCode = v.ViewCode)
            OR EXISTS  (SELECT 1 FROM Security.TenantViews tv
                         WHERE tv.ViewCode = v.ViewCode
                           AND tv.TenantID = CAST(${tenantId} AS uniqueidentifier))
          )
  `;

  // Merge por ViewCode: una vista puede llegar de (A) y (B); mask final = OR.
  const map = new Map<string, ResolvedView>()
  for (const r of rows) {
    const incoming = Number(r.EffectiveMask);
    const existing = map.get(r.ViewCode);
    map.set(r.ViewCode, {
      viewCode: r.ViewCode,
      label: r.Label,
      menuGroup: r.MenuGroup,
      mask: existing ? existing.mask | incoming : incoming
    });
  }

  return [...map.values()].sort(
    (a, b) =>
      (a.menuGroup ?? '').localeCompare(b.menuGroup ?? '') ||
      a.viewCode.localeCompare(b.viewCode)
  );
}
