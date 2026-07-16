import { NextResponse } from 'next/server';

import { Prisma } from '@prisma/client';

import { withPermission, PERM } from '@gaso/shared';

import { withTenantContext } from '@/lib/tenant-context';
import { KNOWN_ACTIONS, ACTION_OTHER, ORIGIN_NONE } from '@/lib/audit/catalog';

export const runtime = 'nodejs'; // Prisma no corre en edge

type AuditRow = {
  AuditID: number;
  TenantID: string;
  UserID: number | null;
  TableName: string;
  Action: string;
  OldData: string | null;
  NewData: string | null;
  ChangedAt: Date;
  AppUser: string | null;
  IdOrigin: number | null;
  Origin: string | null;
}

/**
 * GET /api/audit — visor de auditoría del TENANT EN SESIÓN.
 *
 * Protegido por RBAC: requiere la vista 'audit' con bit R (withPermission).
 * El tenant es SIEMPRE el de la sesión (resuelto por el wrapper).
 * La auditoría GLOBAL cross-tenant es un módulo aparte en apps/admin (depende de contexto mutable; bloqueado hoy por @read_only del pool).
 */
export const GET = withPermission(
  'audit',
  async (req, { tenantId }) => {
    const { searchParams } = new URL(req.url);

    // Filtros opcionales (todos parametrizados más abajo)
    const action = searchParams.get('action');
    const userIdRaw = searchParams.get('userId');
    const userId = userIdRaw ? Number(userIdRaw) : null;
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const originRaw = searchParams.get('origin');
    const search = searchParams.get('search'); // texto parcial: AppUser / Action / TableName

    // Paginación
    const draw = Number(searchParams.get('draw') ?? '1');
    const pageSize = Math.min(Math.max(Number(searchParams.get('length') ?? '25'), 1), 100);
    const offset = Math.max(Number(searchParams.get('start') ?? '0'), 0);

    // WHERE parametrizado y componible. NUNCA texto crudo: todo va como ${param}.
    const conditions: Prisma.Sql[] = [];

    // RLS ya filtra por contexto; filtramos explícito también.
    conditions.push(Prisma.sql`TenantID = CAST(${tenantId} AS uniqueidentifier)`);

    if (action === ACTION_OTHER) {
      conditions.push(Prisma.sql`Action NOT IN (${Prisma.join(KNOWN_ACTIONS)})`);
    } else if (action) {
      conditions.push(Prisma.sql`Action = ${action}`);
    }

    if (userId !== null && !Number.isNaN(userId)) conditions.push(Prisma.sql`UserID = ${userId}`);
    if (dateFrom) conditions.push(Prisma.sql`ChangedAt >= ${dateFrom}`);
    if (dateTo) conditions.push(Prisma.sql`ChangedAt <= ${dateTo}`);

    if (originRaw === ORIGIN_NONE) {
      conditions.push(Prisma.sql`IdOrigin IS NULL`);
    } else if (originRaw) {
      const origin = Number(originRaw);

      if (!Number.isNaN(origin)) conditions.push(Prisma.sql`IdOrigin = ${origin}`);
    }

    if (search) {
      const escaped = search.replace(/[|%_[]/g, c => `|${c}`);
      const pattern = `%${escaped}%`;

      conditions.push(
        Prisma.sql`(AppUser LIKE ${pattern} ESCAPE '|' OR Action LIKE ${pattern} ESCAPE '|' OR TableName LIKE ${pattern} ESCAPE '|')`
      );
    }

    const whereClause = Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`;

    try {
      // Mismo contexto/conexión para COUNT y SELECT → RLS consistente.
      const { total, rows } = await withTenantContext(tenantId, async tx => {
        const countResult = await tx.$queryRaw<Array<{ total: bigint }>>(
          Prisma.sql`SELECT COUNT(*) AS total FROM Audit.TransactionLog ${whereClause}`
        );

        const total = Number(countResult[0]?.total ?? 0);

        const rows = await tx.$queryRaw<AuditRow[]>(
          Prisma.sql`
            SELECT AuditID, TenantID, UserID, TableName, Action,
              OldData, NewData, ChangedAt, AppUser, IdOrigin, O.Nombre AS Origin
            FROM Audit.TransactionLog TL
            LEFT JOIN Audit.Cat_OriginTL O ON O.Id = TL.IdOrigin
            ${whereClause}
            ORDER BY ChangedAt DESC
            OFFSET ${offset} ROWS FETCH NEXT ${pageSize} ROWS ONLY
          `
        );

        return { total, rows };
      })

      // Serializar manejando BigInt (AuditID puede venir como bigint).
      const body = JSON.stringify(
        { draw, recordsTotal: total, recordsFiltered: total, data: rows },
        (_key, value) => (typeof value === 'bigint' ? Number(value) : value)
      );

      return new NextResponse(body, {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (e) {
      console.error('[AUDIT_VIEWER_ERROR]', e instanceof Error ? { message: e.message } : e);

      return NextResponse.json({ message: 'Error al consultar la auditoría' }, { status: 500 });
    }
  },
  { bit: PERM.R }
);
