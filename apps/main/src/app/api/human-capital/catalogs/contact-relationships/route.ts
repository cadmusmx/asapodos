import { NextResponse } from 'next/server';

import { Prisma } from '@prisma/client';

import { PERM, withPermission } from '@gaso/shared';

import { withTenantContext } from '@/lib/tenant-context';

export const runtime = 'nodejs';

// Catálogo GLOBAL (sin TenantID / sin RLS); el wrap de tx es sólo por consistencia.
export const GET = withPermission(
  'employees',
  async (_req, { tenantId }) => {
    return withTenantContext(tenantId, async tx => {
      const rows = await tx.$queryRaw<Array<{ RelationshipID: number; Name: string }>>(
        Prisma.sql`
          SELECT RelationshipID, Name
          FROM HumanCapital.ContactRelationships
          WHERE IsActive = 1
          ORDER BY Name
        `
      );

      return NextResponse.json({ data: rows.map(r => ({ id: r.RelationshipID, name: r.Name })) });
    });
  },
  { bit: PERM.R }
);
