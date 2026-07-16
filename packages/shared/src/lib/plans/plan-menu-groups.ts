import { ERP_VARIABLE_TO_MODULE, ErpModuleKey } from '../erp-modules';

import type { Prisma } from '@prisma/client';

/**
 * MenuGroups que el PLAN del tenant habilita. FUENTE ÚNICA de la compuerta de plan.
 * Cadena: TenantSubscriptions(ACTIVE/TRIAL) → PlanFeatures → Cat_Modulos.Variable → puente → MenuGroup.
 * Corre dentro de withTenantContext (recibe tx). Ignora filas submódulo (IdModulo IS NOT NULL).
 * Módulos del ERP viejo sin puente (d_mapas, sitios, reportes) se descartan (if (key)).
 */
export async function getEnabledMenuGroups(
  tx: Prisma.TransactionClient,
  tenantId: string,
): Promise<Set<ErpModuleKey>> {
  // 1) Suscripción vigente → PlanId.
  const subRows = await tx.$queryRaw<Array<{ PlanId: number }>>`
    SELECT TOP 1 PlanId
    FROM Security.TenantSubscriptions
    WHERE TenantID = CAST(${tenantId} AS uniqueidentifier)
      AND Status IN ('ACTIVE', 'TRIAL')
    ORDER BY StartedAt DESC
  `;

  const planId = subRows[0]?.PlanId ?? null;

  if (planId === null) {
    return new Set();
  }

  // 2–4) PlanFeatures (módulo-level) → Cat_Modulos.Variable → MenuGroup.
  const modRows = await tx.$queryRaw<Array<{ Variable: string | null }>>`
    SELECT DISTINCT m.Variable
    FROM Security.PlanFeatures pf
    JOIN dbo.Cat_Modulos m ON m.IdModulo = pf.IdModulo
    WHERE pf.PlanId = ${planId}
      AND pf.IdModulo IS NOT NULL
      AND m.Status = 1
  `;

  const enabled = new Set<ErpModuleKey>();

  for (const r of modRows) {
    const key = r.Variable ? ERP_VARIABLE_TO_MODULE[r.Variable] : undefined;

    if (key) { enabled.add(key); }
  }

  return enabled;
}
