// Gestión de catálogos VM · fila individual.
//   PUT    -> renombrar y/o REACTIVAR (activo: true). Bit U.
//   DELETE -> borrado LÓGICO (Activo = 0). Bit D.
// Bits por default verbo->bit; sin overrides.
//
// Filas GLOBALES (TenantID NULL): visibles por el filter predicate, pero NO
// modificables. La RLS ya lo bloquea (el block AFTER UPDATE falla porque el
// TenantID resultante sigue NULL), pero ese error es opaco -> se pre-chequea
// aquí y se responde 403 con mensaje claro.

import { NextResponse } from 'next/server';

import { Prisma } from '@prisma/client';

import { withPermission, writeTransactionLog, AUDIT_ACTIONS } from '@gaso/shared';

import { withTenantContext } from '@/lib/tenant-context';
import { CATALOG_REGISTRY, isCatalogKey, type CatalogKey } from '../../_registry';

type RouteCtx = { params: Promise<{ tipo: string; id: string }> };

interface CatalogRowRaw {
  Id: number;
  Nombre: string;
  TenantID: string | null;
  Activo: boolean;
}

/** Resuelve y autoriza la fila: 404 si no existe/no visible, 403 si es global. */
async function resolveOwnRow(
  tx: Prisma.TransactionClient,
  tipo: CatalogKey,
  id: number,
  tenantId: string,
) {
  const { table, nameCol, label } = CATALOG_REGISTRY[tipo];
  const T = Prisma.raw(`dbo.${table}`);
  const N = Prisma.raw(nameCol);

  // TenantID explícito además de RLS (convención del codebase). Se incluye el
  // caso global (NULL) a propósito: hay que VER la fila global para responder
  // 403 con mensaje claro; filtrarla daría un 404 engañoso.
  const rows = await tx.$queryRaw<CatalogRowRaw[]>`
    SELECT Id, ${N} AS Nombre, TenantID, Activo
    FROM ${T}
    WHERE Id = ${id} AND (TenantID = ${tenantId} OR TenantID IS NULL)
  `;

  if (rows.length === 0) return { error: { status: 404 as const, message: 'Registro no encontrado' } };

  const row = rows[0];

  if (row.TenantID === null) {
    return {
      error: {
        status: 403 as const,
        message: `Los catálogos globales no se pueden modificar (${label.toLowerCase()} compartido)`,
      },
    };
  }

  return { row };
}

// PUT · renombrar y/o reactivar (U)
export const PUT = withPermission<RouteCtx>(
  'material_validation',
  async (req, { auth, tenantId }, routeCtx) => {
    try {
      const { tipo, id: rawId } = await routeCtx.params;

      if (!isCatalogKey(tipo)) {
        return NextResponse.json({ message: 'Catálogo no válido' }, { status: 404 });
      }

      const id = Number.parseInt(rawId, 10);

      if (Number.isNaN(id)) {
        return NextResponse.json({ message: 'Id no válido' }, { status: 400 });
      }

      const body = (await req.json().catch(() => null)) as { nombre?: unknown; activo?: unknown } | null;

      if (!body) return NextResponse.json({ message: 'Cuerpo inválido' }, { status: 400 });

      const nombre = typeof body.nombre === 'string' ? body.nombre.trim() : undefined;
      const activo = typeof body.activo === 'boolean' ? body.activo : undefined;

      if (nombre === undefined && activo === undefined) {
        return NextResponse.json({ message: 'No se enviaron campos para actualizar' }, { status: 400 });
      }

      if (nombre !== undefined && !nombre) {
        return NextResponse.json({ message: 'El nombre no puede quedar vacío' }, { status: 400 });
      }

      // Desactivar es borrado lógico -> va por DELETE (bit D), no por aquí.
      if (activo === false) {
        return NextResponse.json(
          { message: 'Para desactivar usa DELETE sobre este recurso' },
          { status: 400 },
        );
      }

      const { table, nameCol, label } = CATALOG_REGISTRY[tipo];
      const T = Prisma.raw(`dbo.${table}`);
      const N = Prisma.raw(nameCol);

      const outcome = await withTenantContext(tenantId, async tx => {
        const resolved = await resolveOwnRow(tx, tipo, id, tenantId);

        if (resolved.error) return resolved.error;
        const before = resolved.row;

        // Colisión de nombre contra otra fila (propia o global).
        if (nombre !== undefined && nombre !== before.Nombre) {
          const dup = await tx.$queryRaw<Array<{ Id: number; TenantID: string | null }>>`
            SELECT TOP 1 Id, TenantID
            FROM ${T}
            WHERE ${N} = ${nombre} AND Id <> ${id} AND (TenantID = ${tenantId} OR TenantID IS NULL)
          `;

          if (dup.length > 0) {
            return {
              status: 409 as const,
              message: dup[0].TenantID === null
                ? `Ya existe un ${label.toLowerCase()} global con ese nombre`
                : `Ya existe otro ${label.toLowerCase()} con ese nombre`,
            };
          }
        }

        const sets: Prisma.Sql[] = [];

        if (nombre !== undefined) sets.push(Prisma.sql`${N} = ${nombre}`);
        if (activo === true) sets.push(Prisma.sql`Activo = 1`);

        if (sets.length === 0) return { status: 200 as const, before, after: before };

        // TenantID explícito además de RLS (convención del codebase).
        await tx.$executeRaw`
          UPDATE ${T} SET ${Prisma.join(sets, ', ')}
          WHERE Id = ${id} AND TenantID = ${tenantId}
        `;

        return {
          status: 200 as const,
          before,
          after: { ...before, Nombre: nombre ?? before.Nombre, Activo: activo === true ? true : before.Activo },
        };
      });

      if (outcome.status !== 200) {
        return NextResponse.json({ message: outcome.message }, { status: outcome.status });
      }

      writeTransactionLog({
        tenantId,
        tableName: `dbo.${table}`,
        action: AUDIT_ACTIONS.CATALOG,
        userId: auth.userId,
        oldData: { tipo, id, nombre: outcome.before.Nombre, activo: outcome.before.Activo },
        newData: { tipo, id, nombre: outcome.after.Nombre, activo: outcome.after.Activo, operacion: 'UPDATE' },
      }).catch(() => { });

      return NextResponse.json({ success: true });
    } catch (e) {
      console.error('[material-validation/catalogs PUT]', e);

      return NextResponse.json({ success: false, message: 'Ha ocurrido un error inesperado' }, { status: 500 });
    }
  },
);

// DELETE · borrado lógico (D)
// Idempotente: desactivar algo ya inactivo responde 200 sin cambios.
export const DELETE = withPermission<RouteCtx>(
  'material_validation',
  async (_req, { auth, tenantId }, routeCtx) => {
    try {
      const { tipo, id: rawId } = await routeCtx.params;

      if (!isCatalogKey(tipo)) {
        return NextResponse.json({ message: 'Catálogo no válido' }, { status: 404 });
      }

      const id = Number.parseInt(rawId, 10);

      if (Number.isNaN(id)) {
        return NextResponse.json({ message: 'Id no válido' }, { status: 400 });
      }

      const { table } = CATALOG_REGISTRY[tipo];
      const T = Prisma.raw(`dbo.${table}`);

      const outcome = await withTenantContext(tenantId, async tx => {
        const resolved = await resolveOwnRow(tx, tipo, id, tenantId);

        if (resolved.error) return resolved.error;
        const before = resolved.row;

        if (!before.Activo) return { status: 200 as const, before, changed: false };

        await tx.$executeRaw`
          UPDATE ${T} SET Activo = 0 WHERE Id = ${id} AND TenantID = ${tenantId}
        `;

        return { status: 200 as const, before, changed: true };
      });

      if (outcome.status !== 200) {
        return NextResponse.json({ message: outcome.message }, { status: outcome.status });
      }

      if (outcome.changed) {
        writeTransactionLog({
          tenantId,
          tableName: `dbo.${table}`,
          action: AUDIT_ACTIONS.CATALOG,
          userId: auth.userId,
          oldData: { tipo, id, nombre: outcome.before.Nombre, activo: true },
          newData: { tipo, id, nombre: outcome.before.Nombre, activo: false, operacion: 'DEACTIVATE' },
        }).catch(() => { });
      }

      return NextResponse.json({ success: true });
    } catch (e) {
      console.error('[material-validation/catalogs DELETE]', e);

      return NextResponse.json({ success: false, message: 'Ha ocurrido un error inesperado' }, { status: 500 });
    }
  },
);
