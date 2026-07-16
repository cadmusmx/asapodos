import type { Prisma } from '@prisma/client';

/**
 * RBAC · Motor de resolución (PURO)
 *
 * Devuelve el set de vistas efectivas de un usuario en su tenant, como la UNIÓN de:
 *   (A) Otorgadas:  UserViews.PermMask  (!= 0)   — directo, SIN techo
 *   (B) Públicas:   Security.Views.PublicMask (no NULL) — todos la reciben sin grant.
 * Si una vista cae en (A) y (B), el mask final es el OR (la pública es un piso).
 *
 * La compuerta de PLAN (módulo ∈ plan del tenant) NO se aplica aquí — el resolver es puro.
 * Se anota por fuera en getEffectiveViews y la combinan requirePermission / la nav, para distinguir "401 por plan" de "401 por permiso".
 *
 * Invariantes: IdDepartamento ya no participa (sin techo);
 * GASOCO_Cat_Usuarios SIN RLS -> filtro por tenant obligatorio;
 * $queryRaw parametrizado sobre el `tx` cuyo SESSION_CONTEXT ya fijó el llamador.
 */

export interface ResolvedView {
  viewCode: string;
  label: string;
  menuGroup: string | null;

  /** mask canónica != 0. */
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
    -- (A) otorgadas: UserViews.PermMask directo (SIN techo)
    SELECT v.ViewCode, v.Label, v.MenuGroup,
           uv.PermMask AS EffectiveMask
    FROM dbo.GASOCO_Cat_Usuarios u
    JOIN Security.UserViews uv
           ON uv.TenantID  = u.TenantID
          AND uv.IdUsuario = u.IdUsuario
    JOIN Security.Views v
           ON v.ViewCode = uv.ViewCode
    WHERE u.IdUsuario = ${idUsuario}
      AND u.TenantID  = CAST(${tenantId} AS uniqueidentifier)
      AND uv.PermMask <> 0

    UNION ALL

    -- (B) públicas: PublicMask para todos
    SELECT v.ViewCode, v.Label, v.MenuGroup,
           v.PublicMask AS EffectiveMask
    FROM Security.Views v
    WHERE v.PublicMask IS NOT NULL
  `;

  // Merge por ViewCode: una vista puede llegar de (A) y (B); mask final = OR.
  const map = new Map<string, ResolvedView>();
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
