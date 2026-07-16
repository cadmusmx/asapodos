import { NextResponse } from 'next/server';

import { Prisma } from '@prisma/client';

import {
  withPermission, PERM, PERM_NONE, isCanonical, describeMask,
  writeTransactionLog,
  PERM_ALL,
  ErpModuleKey,
  getEnabledMenuGroups,
} from '@gaso/shared';

import { withTenantContext } from '@/lib/tenant-context';
import { resolveAssignmentScope } from '@/lib/permissions/assignment-scope';

export const runtime = 'nodejs';

const PROTECTED_VIEW = 'permissions_access';

type GrantInput = { viewCode: string; permMask: number };

type ApplyBody = {
  idDepartamento: number;
  idPuesto: number | null;
  idPerfil: number | null;
  grants: GrantInput[];
  mode: 'OR' | 'SET';
  dryRun: boolean;
};

type ValidationError = { field: string; message: string };

/**
 * Validación server-side del cuerpo.
 * NUNCA confía en el cliente: canonicidad, no-cero (guarda 2), permissions_access excluida, sin duplicados.
 * `mode` es REQUERIDO y explícito — la API no defaultea un flag con capacidad destructiva;
 * el cliente declara intención (default OR vive en el checkbox del modal).
 */
function parseApplyBody(
  raw: unknown,
): { ok: true; body: ApplyBody } | { ok: false; errors: ValidationError[] } {
  if (typeof raw !== 'object' || raw === null) {
    return { ok: false, errors: [{ field: 'body', message: 'Cuerpo inválido' }] };
  }

  const b = raw as Record<string, unknown>;
  const errors: ValidationError[] = [];

  const idDepartamento = b.idDepartamento;

  if (typeof idDepartamento !== 'number' || !Number.isInteger(idDepartamento)) {
    errors.push({ field: 'idDepartamento', message: 'Requerido, entero' });
  }

  const normOptInt = (v: unknown, field: string): number | null => {
    if (v === null || v === undefined) return null;
    if (typeof v === 'number' && Number.isInteger(v)) return v;
    errors.push({ field, message: 'Debe ser entero o null' });

    return null;
  };

  const idPuesto = normOptInt(b.idPuesto, 'idPuesto');
  const idPerfil = normOptInt(b.idPerfil, 'idPerfil');

  const mode = b.mode;

  if (mode !== 'OR' && mode !== 'SET') {
    errors.push({ field: 'mode', message: "Requerido: 'OR' | 'SET'" });
  }

  const grants: GrantInput[] = [];

  if (!Array.isArray(b.grants) || b.grants.length === 0) {
    errors.push({ field: 'grants', message: 'Requerido, arreglo no vacío' });
  } else {
    const seen = new Set<string>();

    b.grants.forEach((g, i) => {
      if (typeof g !== 'object' || g === null) {
        errors.push({ field: `grants[${i}]`, message: 'Inválido' });

        return;
      }

      const gv = g as Record<string, unknown>;
      const viewCode = gv.viewCode;
      const permMask = gv.permMask;

      if (typeof viewCode !== 'string' || viewCode.trim() === '') {
        errors.push({ field: `grants[${i}].viewCode`, message: 'Requerido, string' });

        return;
      }

      if (viewCode === PROTECTED_VIEW) {
        errors.push({ field: `grants[${i}].viewCode`, message: 'Vista protegida, no asignable' });

        return;
      }

      if (seen.has(viewCode)) {
        errors.push({ field: `grants[${i}].viewCode`, message: 'Vista duplicada' });

        return;
      }

      seen.add(viewCode);

      if (typeof permMask !== 'number' || !isCanonical(permMask)) {
        errors.push({ field: `grants[${i}].permMask`, message: 'Máscara no canónica' });

        return;
      }

      if (permMask === PERM_NONE) {
        errors.push({ field: `grants[${i}].permMask`, message: 'Máscara 0 no permitida (revoke fuera de alcance)' });

        return;
      }

      grants.push({ viewCode, permMask });
    });
  }

  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    body: {
      idDepartamento: idDepartamento as number,
      idPuesto,
      idPerfil,
      grants,
      mode: mode as 'OR' | 'SET',
      dryRun: b.dryRun === true,
    },
  };
}

/**
 * POST /api/permissions/presets/apply - pasos 1–4 (SIN cómputo, SIN escritura).
 *
 * Cuatro pisos: auth+RBAC (withPermission PERM.W) · tenant (withTenantContext + TenantID explícito) · parametrizado ($queryRaw).
 * Devuelve el conjunto afectado y los grants validados para verificación.
 * El cómputo (paso 5) y la escritura atómica + log (paso 6) son el siguiente gate.
 */
export const POST = withPermission(
  'permissions_access',
  async (req, { auth, tenantId }) => {
    let raw: unknown;

    try {
      raw = await req.json();
    } catch {
      return NextResponse.json({ message: 'JSON inválido' }, { status: 400 });
    }

    const parsed = parseApplyBody(raw);

    if (!parsed.ok) {
      return NextResponse.json({ message: 'Validación fallida', errors: parsed.errors }, { status: 400 });
    }

    const body = parsed.body;

    try {
      const result = await withTenantContext(tenantId, async tx => {
        // Paso 1 - alcance del actor. Punto único de verdad. null => fail-closed.
        const scope = await resolveAssignmentScope(tx, tenantId, auth.userId);

        if (scope === null) {
          return { status: 403 as const, payload: { message: 'Sin departamento asignado' } };
        }

        // Paso 2 - autorizar el depto-objetivo. El preset.IdDepartamento es DATO,
        // se re-valida contra el actor de ESTE momento, no contra quien lo creó.
        const targetAllowed = scope.hasFullScope || body.idDepartamento === scope.actorDept;

        if (!targetAllowed) {
          return { status: 403 as const, payload: { message: 'Departamento fuera de alcance' } };
        }

        // Paso 3 — compuerta de PLAN (reemplaza el techo).
        // Rechaza grants cuyo módulo no esté en el plan del tenant.
        const viewCodes = body.grants.map(g => g.viewCode);

        const enabled = await getEnabledMenuGroups(tx, tenantId);

        const viewMenuGroups = await tx.$queryRaw<Array<{ ViewCode: string; MenuGroup: string | null }>>(
          Prisma.sql`
            SELECT ViewCode, MenuGroup
            FROM Security.Views
            WHERE ViewCode IN (${Prisma.join(viewCodes)})
          `,
        );

        const menuGroupByView = new Map(viewMenuGroups.map(r => [r.ViewCode, r.MenuGroup]));

        const planRejected = body.grants
          .filter(g => {
            const mg = menuGroupByView.get(g.viewCode);
            return !mg || !enabled.has(mg as ErpModuleKey);
          })
          .map(g => g.viewCode);

        if (planRejected.length > 0) {
          return {
            status: 403 as const,
            payload: { message: 'Vistas fuera del plan del tenant', code: 'PLAN_RESTRICTED', views: planRejected },
          };
        }

        // grantsResolved SIN techo. ceilingMask/exceedsCeiling constantes (compat de shape,
        // deprecados — el front los deja de leer en el treeshake).
        const grantsResolved = body.grants.map(g => ({
          viewCode: g.viewCode,
          permMask: g.permMask,
          mask: describeMask(g.permMask),
          ceilingMask: describeMask(PERM_ALL),
          exceedsCeiling: false,
        }));

        // Paso 4 - conjunto afectado (verificado contra Argos_Dev).
        const scopeConds: Prisma.Sql[] = [
          Prisma.sql`u.TenantID = CAST(${tenantId} AS uniqueidentifier)`,
          Prisma.sql`u.Estatus = 'A'`,
          Prisma.sql`u.IdDepartamento = ${body.idDepartamento}`,
        ];

        if (body.idPuesto !== null) scopeConds.push(Prisma.sql`u.IdPuesto = ${body.idPuesto}`);
        if (body.idPerfil !== null) scopeConds.push(Prisma.sql`u.IdPerfil = ${body.idPerfil}`);

        const afectados = await tx.$queryRaw<Array<{
          IdUsuario: number;
          Nombre: string | null;
          IdPuesto: number | null;
          IdPerfil: number | null;
        }>>(
          Prisma.sql`
            SELECT u.IdUsuario, u.Nombre, u.IdPuesto, u.IdPerfil
            FROM dbo.GASOCO_Cat_Usuarios u
            WHERE ${Prisma.join(scopeConds, ' AND ')}
            ORDER BY u.Nombre
          `,
        );

        // Paso 5 - cómputo dryRun (diff actual → nuevo). SIN escritura.

        // Máscaras actuales del conjunto sobre las vistas del preset, en UNA query.
        // UserViews es disperso: fila ausente => base 0 (semántica LEFT vía Map).
        const userIds = afectados.map(u => u.IdUsuario);

        const currentRows = userIds.length === 0
          ? []
          : await tx.$queryRaw<Array<{ IdUsuario: number; ViewCode: string; PermMask: number }>>(
            Prisma.sql`
                SELECT IdUsuario, ViewCode, PermMask
                FROM Security.UserViews
                WHERE TenantID = CAST(${tenantId} AS uniqueidentifier)
                  AND IdUsuario IN (${Prisma.join(userIds)})
                  AND ViewCode IN (${Prisma.join(viewCodes)})
              `,
          );

        const currentByKey = new Map<string, number>(
          currentRows.map(r => [`${r.IdUsuario}:${r.ViewCode}`, r.PermMask]),
        );

        // Resumen de impacto: por vista (lo que el admin configuró) + por usuario (celdas que cambian).
        const perView = grantsResolved.map(g => ({
          viewCode: g.viewCode,
          granted: g.permMask,
          grantedMask: g.mask,
          ceilingMask: g.ceilingMask,
          exceedsCeiling: g.exceedsCeiling, // grant pedía > techo (se recorta; advertir en UI)
          writes: 0,
          removals: 0,
          unchanged: 0,
        }));

        const pvIndex = new Map(perView.map((pv, i) => [pv.viewCode, i]));

        const perUser: Array<{
          idUsuario: number;
          nombre: string;
          changes: Array<{ viewCode: string; current: string; nuevo: string; removedMask: string | null }>;
        }> = [];

        let totalWrites = 0;
        let totalRemovals = 0;

        const operations: Array<{ idUsuario: number; viewCode: string; actual: number; nuevo: number }> = [];

        for (const u of afectados) {
          const changes: typeof perUser[number]['changes'] = [];

          for (const g of grantsResolved) {
            const actual = currentByKey.get(`${u.IdUsuario}:${g.viewCode}`) ?? PERM_NONE;

            // Sin techo: SET reemplaza, OR agrega.
            // nuevo es canónico por construcción (permMask validada; OR de canónicas no-cero conserva R).
            const nuevo = body.mode === 'SET' ? g.permMask : (actual | g.permMask);

            const removed = actual & ~nuevo; // bits perdidos: SET puede; OR(a) es siempre 0
            const changed = nuevo !== actual;

            const pv = perView[pvIndex.get(g.viewCode)!];

            if (changed) {
              pv.writes += 1;
              totalWrites += 1;
              if (removed !== PERM_NONE) { pv.removals += 1; totalRemovals += 1; }
              changes.push({
                viewCode: g.viewCode,
                current: describeMask(actual),
                nuevo: describeMask(nuevo),
                removedMask: removed !== PERM_NONE ? describeMask(removed) : null,
              });
              operations.push({ idUsuario: u.IdUsuario, viewCode: g.viewCode, actual, nuevo });
            } else {
              pv.unchanged += 1;
            }
          }

          if (changes.length > 0) {
            perUser.push({ idUsuario: u.IdUsuario, nombre: u.Nombre ?? '', changes });
          }
        }

        // Paso 6 - escritura (camino B). Consume el diff del paso 5. Atómico en tx.
        const applied = { inserts: 0, updates: 0, deletes: 0 };

        if (!body.dryRun) {
          for (const op of operations) {
            if (op.actual === PERM_NONE) {
              // Sin fila previa => INSERT.
              await tx.$executeRaw(
                Prisma.sql`
                  INSERT INTO Security.UserViews (TenantID, IdUsuario, ViewCode, PermMask)
                  VALUES (CAST(${tenantId} AS uniqueidentifier), ${op.idUsuario}, ${op.viewCode}, ${op.nuevo})
                `,
              );
              applied.inserts += 1;
            } else {
              // Fila previa + nuevo != actual => UPDATE. (nuevo nunca 0 sin techo ⇒ sin DELETE.)
              await tx.$executeRaw(
                Prisma.sql`
                  UPDATE Security.UserViews
                  SET PermMask = ${op.nuevo}
                  WHERE TenantID = CAST(${tenantId} AS uniqueidentifier)
                    AND IdUsuario = ${op.idUsuario} AND ViewCode = ${op.viewCode}
                `,
              );
              applied.updates += 1;
            }
          }
        }

        return {
          status: 200 as const,
          mode: body.mode,
          logEntries: body.dryRun
            ? null
            : operations.map(op => ({ idUsuario: op.idUsuario, viewCode: op.viewCode, oldMask: op.actual, newMask: op.nuevo })),
          payload: {
            scope,
            target: { idDepartamento: body.idDepartamento, idPuesto: body.idPuesto, idPerfil: body.idPerfil },
            mode: body.mode,
            dryRun: body.dryRun,
            applied: body.dryRun ? null : applied,
            grants: grantsResolved,
            preview: {
              perView,
              perUser,
              totals: {
                usersInScope: afectados.length,
                usersWithWrites: perUser.length,
                writes: totalWrites,
                removals: totalRemovals,
              },
            },
          },
        };
      });

      // commit -> audit. CHPERMSS (preset), con el modo OR/SET en el payload.
      if (result.logEntries) {
        const originRaw = req.headers.get('x-origin-id');
        const parsedOrigin = originRaw !== null ? Number(originRaw) : NaN;
        const idOrigin = Number.isInteger(parsedOrigin) ? parsedOrigin : undefined;

        for (const e of result.logEntries) {
          writeTransactionLog({
            tenantId,
            tableName: 'Security.UserViews',
            action: 'CHPERMSS',
            userId: auth.userId,
            appUser: auth.email ?? null,
            idOrigin,
            oldData: { idUsuario: e.idUsuario, viewCode: e.viewCode, mask: e.oldMask, mode: result.mode },
            newData: { idUsuario: e.idUsuario, viewCode: e.viewCode, mask: e.newMask, mode: result.mode },
            changedAt: new Date(),
          }).catch(() => { });
        }
      }

      return NextResponse.json(result.payload, { status: result.status });
    } catch (e) {
      console.error('[PRESETS_APPLY_ERROR]', e instanceof Error ? { message: e.message } : e);

      return NextResponse.json({ message: 'Error al aplicar preset' }, { status: 500 });
    }
  },
  { bit: PERM.W },
);
