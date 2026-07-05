import { NextResponse } from 'next/server';

import {
  PERM,
  ValidationError,
  assignPermission,
  withPermission,
  writeTransactionLog
} from '@gaso/shared';

export const runtime = 'nodejs';
interface ParsedBody {
  targetIdUsuario: number;
  viewCode: string;
  mask: number;
}

// La ruta valida la FORMA (tipos); la SEMÁNTICA (canonicidad, techo, view existe)
// la valida assignPermission. Sin solapar.
function parseBody(raw: unknown): ParsedBody {
  if (typeof raw !== 'object' || raw === null) {
    throw new ValidationError('Body inválido', 'INVALID_MASK');
  }

  const b = raw as Record<string, unknown>;

  if (!Number.isInteger(b.targetIdUsuario)) {
    throw new ValidationError('targetIdUsuario debe ser entero', 'INVALID_MASK');
  }

  if (typeof b.viewCode !== 'string' || b.viewCode.trim() === '') {
    throw new ValidationError('viewCode requerido', 'UNKNOWN_VIEW');
  }

  if (!Number.isInteger(b.mask)) {
    throw new ValidationError('mask debe ser entero', 'INVALID_MASK');
  }

  return {
    targetIdUsuario: b.targetIdUsuario as number,
    viewCode: (b.viewCode as string).trim(),
    mask: b.mask as number
  };
}

/**
 * POST /api/admin/permissions  (apps/main — admin de tenant)
 *
 * Otorga/revoca un permiso de un usuario sobre una vista. Idempotente.
 * Body: { targetIdUsuario: number, viewCode: string, mask: number }  (mask 0 = revocar)
 *
 * Se blinda con withPermission('permissions_access', U):
 *    para ESCRIBIR permisos primero hay que poder ACTUALIZAR la vista de administración.
 * El guardarraíl de fondo (isAdmin en vivo, alcance, techo, canonicidad) vive en assignPermission.
 * Auditoría PERM_CHG tras el commit (commit -> audit, nunca bloquea).
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

    const { targetIdUsuario, viewCode, mask } = parseBody(raw);

    const result = await assignPermission({
      tenantId,
      actorIdUsuario: auth.userId,
      targetIdUsuario,
      viewCode,
      mask
    });

    // Origen real del request: x-origin-id si viene y es entero; si no, NULL (sin origen).
    const originRaw = req.headers.get('x-origin-id');
    const parsedOrigin = originRaw !== null ? Number(originRaw) : NaN;
    const idOrigin = Number.isInteger(parsedOrigin) ? parsedOrigin : undefined;

    // commit -> audit. El actor es auth.userId; target/viewCode/old->new en el payload.
    writeTransactionLog({
      tenantId,
      tableName: 'Security.UserViews',
      action: 'PERM_CHG',
      userId: auth.userId,
      appUser: auth.email ?? null,
      idOrigin,
      oldData: { idUsuario: result.target, viewCode, mask: result.old },
      newData: { idUsuario: result.target, viewCode, mask: result.new }
    }).catch(() => { });

    return NextResponse.json({ ok: true, old: result.old, new: result.new });
  },
  { bit: PERM.U }
)
