import { NextResponse } from 'next/server';

import {
  ForbiddenError,
  PERM,
  ValidationError,
  assignPermissionsBatch,
  withPermission,
  writeTransactionLog
} from '@gaso/shared';

export const runtime = 'nodejs';

interface ParsedBatchBody {
  targetIdUsuario: number;
  changes: { viewCode: string; mask: number }[];
}

// Forma (tipos + reglas de lote). La semántica por-vista vive en assignPermissionsBatch.
function parseBody(raw: unknown): ParsedBatchBody {
  if (typeof raw !== 'object' || raw === null) {
    throw new ValidationError('Body inválido', 'INVALID_MASK');
  }
  const b = raw as Record<string, unknown>;

  if (!Number.isInteger(b.targetIdUsuario)) {
    throw new ValidationError('targetIdUsuario debe ser entero', 'INVALID_MASK');
  }

  // changes vacío -> 400 (decisión del dev)
  if (!Array.isArray(b.changes) || b.changes.length === 0) {
    throw new ValidationError('changes debe ser una lista no vacía', 'INVALID_MASK');
  }

  const changes = b.changes.map((c, i) => {
    if (typeof c !== 'object' || c === null) {
      throw new ValidationError(`changes[${i}] inválido`, 'INVALID_MASK');
    }
    const cc = c as Record<string, unknown>;
    if (typeof cc.viewCode !== 'string' || cc.viewCode.trim() === '') {
      throw new ValidationError(`changes[${i}].viewCode requerido`, 'UNKNOWN_VIEW');
    }
    if (!Number.isInteger(cc.mask)) {
      throw new ValidationError(`changes[${i}].mask debe ser entero`, 'INVALID_MASK');
    }

    return { viewCode: (cc.viewCode as string).trim(), mask: cc.mask as number };
  });

  // viewCode duplicado en el lote -> 400 (decisión del dev)
  const seen = new Set<string>();
  for (const c of changes) {
    if (seen.has(c.viewCode)) {
      throw new ValidationError(`viewCode duplicado en el lote: ${c.viewCode}`, 'INVALID_MASK', {
        viewCode: c.viewCode
      });
    }
    seen.add(c.viewCode);
  }

  return { targetIdUsuario: b.targetIdUsuario as number, changes };
}

/**
 * POST /api/permissions/batch  (apps/main — admin de tenant)
 *
 * Aplica N cambios de permisos a UN usuario en UNA transacción: o todos, o ninguno.
 * Body: { targetIdUsuario: number, changes: [{ viewCode: string, mask: number }] }
 *
 * Mismo blindaje que el single: permissions_access:U.
 * Éxito -> { ok:true, target, results:[{viewCode, old, new}] } + N auditorías PERM_CHG.
 * Falla de item -> rollback total (cero escrituras) + { ok:false, code, failedViewCode }.
 */
export const POST = withPermission(
  'permissions_access',
  async (req, { auth, tenantId }) => {
    let raw: unknown;

    try {
      raw = await req.json();
    } catch {
      throw new ValidationError('JSON inválido', 'INVALID_MASK');
    }

    const { targetIdUsuario, changes } = parseBody(raw);

    let result;

    try {
      result = await assignPermissionsBatch({
        tenantId,
        actorIdUsuario: auth.userId,
        targetIdUsuario,
        changes
      });
    } catch (e) {
      // Falla de dominio de UN item -> ya hubo rollback en $transaction.
      // Mapeamos aquí (no en el HOF) para devolver la vista ofensora a la UI.
      if (e instanceof ValidationError) {
        return NextResponse.json(
          { ok: false, code: e.code, failedViewCode: (e.details?.viewCode as string) ?? null, message: e.message },
          { status: 400 }
        );
      }
      if (e instanceof ForbiddenError) {
        console.warn('[RBAC_FORBIDDEN_BATCH]', e.code, e.details ?? {});

        return NextResponse.json(
          { ok: false, code: e.code, failedViewCode: (e.details?.viewCode as string) ?? null, message: 'Permiso denegado' },
          { status: 403 }
        );
      }
      throw e; // TenantError / inesperado -> manejo existente
    }

    // commit -> audit: una entrada PERM_CHG por item (solo si el lote entero pasó).
    const originRaw = req.headers.get('x-origin-id');
    const parsedOrigin = originRaw !== null ? Number(originRaw) : NaN;
    const idOrigin = Number.isInteger(parsedOrigin) ? parsedOrigin : undefined;

    for (const r of result.results) {
      writeTransactionLog({
        tenantId,
        tableName: 'Security.UserViews',
        action: 'PERM_CHG',
        userId: auth.userId,
        appUser: auth.email ?? null,
        idOrigin,
        oldData: { idUsuario: result.target, viewCode: r.viewCode, mask: r.old },
        newData: { idUsuario: result.target, viewCode: r.viewCode, mask: r.new }
      }).catch(() => { });
    }

    return NextResponse.json({ ok: true, target: result.target, results: result.results });
  },
  { bit: PERM.U }
);
