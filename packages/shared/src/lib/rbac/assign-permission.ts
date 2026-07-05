import { ForbiddenError, ValidationError } from './errors';
import { describeMask, isCanonical, PERM, withinCeiling } from './permission-mask';
import { resolveUserViews } from './resolve-permissions';

import { withTenantContext } from '../tenant-context';
import { Prisma } from '@prisma/client';

/**
 * RBAC · Asignación de permisos
 *
 * Único punto que ESCRIBE Security.UserViews. El admin de tenant otorga/revoca
 * permisos sobre una vista, acotado por el techo del departamento del target.
 *
 * Guardarraíl (todo dentro de UNA transacción, datos leídos EN VIVO para evitar
 * TOCTOU; orden fail-closed):
 *   1. viewCode existe en Security.Views.                          -> ValidationError 400
 *   2. actor existe en el tenant y isAdmin == 1 (en vivo).         -> ForbiddenError 403
 *   3. target existe en el tenant (en vivo).                       -> ForbiddenError 403
 *   4. target no es otro admin (salvo que sea el propio actor).    -> ForbiddenError 403
 *   5. alcance: actor en depto privilegiado, o mismo depto que el target. -> 403
 *   6. isCanonical(mask).                                          -> ValidationError 400
 *   7. withinCeiling(mask, techoDepto(target)).                    -> ForbiddenError 403
 *   8. escribe: mask == 0 -> DELETE; si no -> upsert.
 *
 * Devuelve { old, new, target } para que el ENDPOINT audite tras el commit
 * (commit -> audit). El servicio NO audita por dentro.
 *
 * Corre en el contexto del tenant del request (admin.TenantID == header) -> nunca
 * cruza tenant, así que el @read_only/throw latente del pool no aplica aquí.
 */

export interface AssignPermissionInput {
  tenantId: string;
  /** Actor: viene de la sesión ya resuelta por withPermission. */
  actorIdUsuario: number;
  /** Target: del body. */
  targetIdUsuario: number;
  viewCode: string;
  /** Del body. 0 = revocar (borra la fila). */
  mask: number;
}

export interface AssignPermissionResult {
  /** Máscara previa del target sobre la vista (null si no existía fila). */
  old: number | null;
  /** Máscara resultante (0 = fila borrada). */
  new: number;
  /** idUsuario del target, para el log de auditoría. */
  target: number;
}

interface UsuarioRow {
  IdUsuario: number;
  IdDepartamento: number | null;
}

export function assignPermission(input: AssignPermissionInput): Promise<AssignPermissionResult> {
  const { actorIdUsuario, targetIdUsuario, viewCode, mask } = input;
  const tenantId = input.tenantId.toLowerCase();

  return withTenantContext(tenantId, async tx => {
    const actor = await resolveActorContext(tx, tenantId, actorIdUsuario);
    const r = await applyOneChange(tx, tenantId, actor, targetIdUsuario, { viewCode, mask });

    // preserva EXACTO el contrato AssignPermissionResult { old, new, target } (sin viewCode)
    return { old: r.old, new: r.new, target: r.target };
  });
}

export interface AssignPermissionsBatchInput {
  tenantId: string;
  actorIdUsuario: number;
  targetIdUsuario: number;
  changes: ChangeInput[];
}

export interface BatchChangeResult {
  viewCode: string;
  old: number | null;
  new: number;
}

export interface AssignPermissionsBatchResult {
  ok: true;
  target: number;
  results: BatchChangeResult[];
}

export function assignPermissionsBatch(
  input: AssignPermissionsBatchInput
): Promise<AssignPermissionsBatchResult> {
  const { actorIdUsuario, targetIdUsuario, changes } = input;
  const tenantId = input.tenantId.toLowerCase();

  return withTenantContext(tenantId, async tx => {
    // actor: INVARIANTE del lote -> se resuelve una vez (autoridad + privilegio territorial)
    const actor = await resolveActorContext(tx, tenantId, actorIdUsuario);

    const results: BatchChangeResult[] = [];

    // SECUENCIAL a propósito: la interactive tx de Prisma no es concurrente (nada de Promise.all sobre el mismo tx).
    // Cualquier throw se propaga -> $transaction hace rollback -> CERO escrituras (atomicidad real).
    for (const change of changes) {
      const r = await applyOneChange(tx, tenantId, actor, targetIdUsuario, change);
      results.push({ viewCode: r.viewCode, old: r.old, new: r.new });
    }

    return { ok: true, target: targetIdUsuario, results };
  });
}

interface ActorContext {
  idUsuario: number;
  idDepartamento: number | null;
  /** depto del actor ∈ Security.AssignableDepartments → alcance a todo el tenant. */
  privileged: boolean;
}

interface ActorRow {
  IdUsuario: number;
  IdDepartamento: number | null;
}

async function resolveActorContext(
  tx: Prisma.TransactionClient,
  tenantId: string, // ya .toLowerCase() por el wrapper
  actorIdUsuario: number
): Promise<ActorContext> {
  // A1) existencia + depto. GASOCO_Cat_Usuarios SIN RLS -> filtro TenantID obligatorio.
  //     Ya NO seleccionamos isAdmin: el motor deja de mirarlo.
  const actorRows = await tx.$queryRaw<ActorRow[]>`
    SELECT IdUsuario, IdDepartamento
    FROM dbo.GASOCO_Cat_Usuarios
    WHERE IdUsuario = ${actorIdUsuario} AND TenantID = CAST(${tenantId} AS uniqueidentifier)
  `;
  const actor = actorRows[0];
  if (!actor) {
    throw new ForbiddenError('No autorizado para asignar permisos', 'PERMISSION_DENIED');
  }

  // A2) autoridad (reemplaza a isAdmin): permissions_access:U EN VIVO, sobre el mismo tx.
  const views = await resolveUserViews(tx, { tenantId, idUsuario: actorIdUsuario });
  const permMask = views.find(v => v.viewCode === 'permissions_access')?.mask ?? 0;
  if ((permMask & PERM.U) === 0) {
    throw new ForbiddenError('No autorizado para asignar permisos', 'PERMISSION_DENIED');
  }

  // A3) privilegio territorial. Filtro TenantID explícito (convención del archivo).
  let privileged = false;
  if (actor.IdDepartamento != null) {
    const privRows = await tx.$queryRaw<Array<{ ok: number }>>`
      SELECT TOP 1 1 AS ok
      FROM Security.AssignableDepartments
      WHERE TenantID = CAST(${tenantId} AS uniqueidentifier)
        AND IdDepartamento = ${actor.IdDepartamento}
    `;
    privileged = privRows.length > 0;
  }

  return { idUsuario: actor.IdUsuario, idDepartamento: actor.IdDepartamento, privileged };
}

interface ChangeInput {
  viewCode: string;
  mask: number;
}

interface ChangeResult {
  viewCode: string;
  old: number | null;
  new: number;
  target: number;
}

async function applyOneChange(
  tx: Prisma.TransactionClient,
  tenantId: string,        // ya .toLowerCase() por el wrapper
  actor: ActorContext,     // resuelto UNA vez por resolveActorContext
  targetIdUsuario: number,
  { viewCode, mask }: ChangeInput
): Promise<ChangeResult> {
  // I1) viewCode existe. Security.Views es catálogo GLOBAL -> sin filtro de tenant.
  const viewRows = await tx.$queryRaw<Array<{ ok: number }>>`
    SELECT TOP 1 1 AS ok FROM Security.Views WHERE ViewCode = ${viewCode}
  `;
  if (viewRows.length === 0) {
    throw new ValidationError(`Vista desconocida: ${viewCode}`, 'UNKNOWN_VIEW', { viewCode });
  }

  // I2) regla b (Modelo A): permissions_access NO se escribe por este flujo, para NADIE
  //     (ni a otro admin ni a uno mismo). Depende solo del viewCode -> va temprano.
  if (viewCode === 'permissions_access') {
    throw new ValidationError(
      'La vista permissions_access solo se administra por aprovisionamiento',
      'PROTECTED_VIEW',
      { viewCode }
    );
  }

  // I3) canonicidad (función pura -> falla barato, antes de leer al target)
  if (!isCanonical(mask)) {
    throw new ValidationError('Máscara de permisos no válida', 'INVALID_MASK', { mask });
  }

  // I4) target en vivo. SIN RLS -> filtro TenantID. No revelamos "no existe" vs "otro tenant".
  const targetRows = await tx.$queryRaw<UsuarioRow[]>`
    SELECT IdUsuario, IdDepartamento
    FROM dbo.GASOCO_Cat_Usuarios
    WHERE IdUsuario = ${targetIdUsuario} AND TenantID = CAST(${tenantId} AS uniqueidentifier)
  `;
  const target = targetRows[0];
  if (!target) {
    throw new ForbiddenError('Usuario destino no válido', 'PERMISSION_DENIED');
  }

  // I5) alcance: actor privilegiado, o mismo depto que el target
  const sameDept =
    actor.idDepartamento != null &&
    target.IdDepartamento != null &&
    actor.idDepartamento === target.IdDepartamento;
  if (!actor.privileged && !sameDept) {
    throw new ForbiddenError('Fuera de tu alcance de administración', 'PERMISSION_DENIED', {
      targetIdUsuario,
    });
  }

  // I6) techo del depto del target (0 si no hay fila -> rechaza cualquier mask > 0)
  const ceilRows = await tx.$queryRaw<Array<{ PermMask: number }>>`
    SELECT PermMask FROM Security.DepartmentViews
    WHERE TenantID = CAST(${tenantId} AS uniqueidentifier)
      AND IdDepartamento = ${target.IdDepartamento}
      AND ViewCode = ${viewCode}
  `;
  const ceiling = ceilRows.length ? Number(ceilRows[0].PermMask) : 0;
  if (!withinCeiling(mask, ceiling)) {
    throw new ForbiddenError(
      `Excede el techo del departamento (techo: ${describeMask(ceiling)})`,
      'PERMISSION_DENIED',
      { viewCode, requestedMask: mask, ceiling }
    );
  }

  // lee máscara previa para auditoría
  const oldRows = await tx.$queryRaw<Array<{ PermMask: number }>>`
    SELECT PermMask FROM Security.UserViews
    WHERE TenantID = CAST(${tenantId} AS uniqueidentifier)
      AND IdUsuario = ${targetIdUsuario} AND ViewCode = ${viewCode}
  `;
  const oldMask = oldRows.length ? Number(oldRows[0].PermMask) : null;

  // escribe: mask 0 = borra; si no -> upsert (update-then-insert, no MERGE)
  if (mask === 0) {
    await tx.$executeRaw`
      DELETE FROM Security.UserViews
      WHERE TenantID = CAST(${tenantId} AS uniqueidentifier)
        AND IdUsuario = ${targetIdUsuario} AND ViewCode = ${viewCode}
    `;
  } else {
    const affected = await tx.$executeRaw`
      UPDATE Security.UserViews SET PermMask = ${mask}
      WHERE TenantID = CAST(${tenantId} AS uniqueidentifier)
        AND IdUsuario = ${targetIdUsuario} AND ViewCode = ${viewCode}
    `;
    if (affected === 0) {
      await tx.$executeRaw`
        INSERT INTO Security.UserViews (TenantID, IdUsuario, ViewCode, PermMask)
        VALUES (CAST(${tenantId} AS uniqueidentifier), ${targetIdUsuario}, ${viewCode}, ${mask})
      `;
    }
  }

  return { viewCode, old: oldMask, new: mask, target: targetIdUsuario };
}
