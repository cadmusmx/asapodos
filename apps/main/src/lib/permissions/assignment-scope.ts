import type { Prisma } from '@prisma/client';

type Tx = Prisma.TransactionClient;

export type AssignmentScope = {
  actorDept: number;
  hasFullScope: boolean;
};

/**
 * Alcance de asignación del actor. PUNTO ÚNICO DE VERDAD:
 * lo consumen /api/permissions/users, /departments y /presets/apply.
 * Debe correr dentro de withTenantContext (recibe tx).
 *
 *  - null            => fail-closed (actor sin departamento). El caller responde 403.
 *  - hasFullScope    => depto del actor ∈ AssignableDepartments (alcance = todo el tenant).
 *  - !hasFullScope   => alcance = solo actorDept.
 *
 * NO decide si un depto-objetivo es válido:
 *  eso es del caller (hasFullScope || target === actorDept).
 *  Este helper solo resuelve "qué puede alcanzar el actor".
 */
export async function resolveAssignmentScope(
  tx: Tx,
  tenantId: string,
  userId: number,
): Promise<AssignmentScope | null> {
  const actorRows = await tx.$queryRaw<Array<{ IdDepartamento: number | null }>>`
    SELECT IdDepartamento
    FROM dbo.GASOCO_Cat_Usuarios
    WHERE IdUsuario = ${userId}
      AND TenantID = CAST(${tenantId} AS uniqueidentifier)
  `;

  const actorDept = actorRows[0]?.IdDepartamento ?? null;

  if (actorDept === null) {
    return null;
  }

  const privRows = await tx.$queryRaw<Array<{ ok: number }>>`
    SELECT TOP 1 1 AS ok
    FROM Security.AssignableDepartments
    WHERE TenantID = CAST(${tenantId} AS uniqueidentifier)
      AND IdDepartamento = ${actorDept}
  `;

  return { actorDept, hasFullScope: privRows.length > 0 };
}
