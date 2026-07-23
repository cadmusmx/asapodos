// app/api/warehouses/material-validation/catalogs/[tipo]/route.ts
//
// Gestión de catálogos VM · colección.
//   GET  -> listar TODO lo visible (propio + global), con Activo y EsGlobal. Bit R.
//   POST -> crear fila del tenant (nunca global). Bit W.
// Bits por default verbo->bit; sin overrides.
//
// Auditoría: acción genérica CATALOG (reusable por otros módulos).

import { NextResponse } from 'next/server';

import { Prisma } from '@prisma/client';

import { withPermission, writeTransactionLog, AUDIT_ACTIONS } from '@gaso/shared';

import { withTenantContext } from '@/lib/tenant-context';
import { CATALOG_REGISTRY, isCatalogKey } from '../_registry';

type RouteCtx = { params: Promise<{ tipo: string }> };

interface CatalogRow {
  Id: number;
  Nombre: string;
  TenantID: string | null;
  Activo: boolean;
  EsGlobal: boolean;
}

// GET · listar (R)
export const GET = withPermission<RouteCtx>(
  'material_validation',
  async (_req, { tenantId }, routeCtx) => {
    try {
      const { tipo } = await routeCtx.params;

      if (!isCatalogKey(tipo)) {
        return NextResponse.json({ message: 'Catálogo no válido' }, { status: 404 });
      }

      const { table, nameCol } = CATALOG_REGISTRY[tipo];
      const T = Prisma.raw(`dbo.${table}`);
      const N = Prisma.raw(nameCol);

      const rows = await withTenantContext(tenantId, tx =>
        tx.$queryRaw<CatalogRow[]>`
          SELECT Id,
                 ${N} AS Nombre,
                 TenantID,
                 Activo,
                 CAST(CASE WHEN TenantID IS NULL THEN 1 ELSE 0 END AS bit) AS EsGlobal
          FROM ${T}
          ORDER BY Activo DESC, ${N} ASC
        `,
      );

      return NextResponse.json({ tipo, rows });
    } catch (e) {
      console.error('[material-validation/catalogs GET]', e);

      return NextResponse.json({ message: 'Ha ocurrido un error inesperado' }, { status: 500 });
    }
  },
);

// POST · crear (W)
// Siempre con TenantID del contexto: un tenant NUNCA crea filas globales
// (esas se siembran por path admin con la policy en OFF).
export const POST = withPermission<RouteCtx>(
  'material_validation',
  async (req, { auth, tenantId }, routeCtx) => {
    try {
      const { tipo } = await routeCtx.params;

      if (!isCatalogKey(tipo)) {
        return NextResponse.json({ message: 'Catálogo no válido' }, { status: 404 });
      }

      const body = (await req.json().catch(() => null)) as { nombre?: unknown } | null;
      const nombre = typeof body?.nombre === 'string' ? body.nombre.trim() : '';

      if (!nombre) {
        return NextResponse.json({ message: 'El nombre es requerido' }, { status: 400 });
      }

      const { table, nameCol, label } = CATALOG_REGISTRY[tipo];
      const T = Prisma.raw(`dbo.${table}`);
      const N = Prisma.raw(nameCol);

      const outcome = await withTenantContext(tenantId, async tx => {
        // Pre-chequeo de colisión: el UNIQUE(TenantID, <nombre>) haría fallar el
        // INSERT igual, pero así devolvemos un mensaje accionable (y el id de la
        // fila inactiva para que la UI ofrezca "reactivar" en vez de crear otra).
        const dup = await tx.$queryRaw<Array<{ Id: number; Activo: boolean; TenantID: string | null }>>`
          SELECT TOP 1 Id, Activo, TenantID
          FROM ${T}
          WHERE ${N} = ${nombre} AND (TenantID = ${tenantId} OR TenantID IS NULL)
        `;

        if (dup.length > 0) {
          const hit = dup[0];

          if (hit.TenantID === null) {
            return { status: 409 as const, message: `Ya existe un ${label.toLowerCase()} global con ese nombre` };
          }

          return hit.Activo
            ? { status: 409 as const, message: `Ya existe un ${label.toLowerCase()} con ese nombre` }
            : {
              status: 409 as const,
              message: `Ya existe un ${label.toLowerCase()} inactivo con ese nombre. Reactívalo en vez de crear uno nuevo.`,
              inactivo: { id: hit.Id, nombre },
            };
        }

        // Id omitido a propósito: IDENTITY en almacenes/tipos, SEQUENCE en proyectos.
        const inserted = await tx.$queryRaw<Array<{ Id: number }>>`
          INSERT INTO ${T} (${N}, TenantID, Activo)
          OUTPUT INSERTED.Id
          VALUES (${nombre}, ${tenantId}, 1)
        `;

        return { status: 200 as const, id: inserted[0].Id };
      });

      if (outcome.status !== 200) {
        return NextResponse.json(
          { message: outcome.message, ...(outcome.inactivo ? { inactivo: outcome.inactivo } : {}) },
          { status: outcome.status },
        );
      }

      writeTransactionLog({
        tenantId,
        tableName: `dbo.${table}`,
        action: AUDIT_ACTIONS.CATALOG,
        userId: auth.userId,
        newData: { tipo, id: outcome.id, nombre, operacion: 'CREATE' },
      }).catch(() => { });

      return NextResponse.json({ success: true, id: outcome.id });
    } catch (e) {
      console.error('[material-validation/catalogs POST]', e);

      return NextResponse.json({ success: false, message: 'Ha ocurrido un error inesperado' }, { status: 500 });
    }
  },
);
