import { NextResponse } from 'next/server';

import { Prisma } from '@prisma/client';

import { PERM, withPermission } from '@gaso/shared';

import { withTenantContext } from '@/lib/tenant-context';

export const runtime = 'nodejs';

// Catálogo GLOBAL (sin TenantID / sin RLS); wrap de tx sólo por consistencia.
export const GET = withPermission(
  'employees',
  async (_req, { tenantId }) => {
    return withTenantContext(tenantId, async tx => {
      const rows = await tx.$queryRaw<Array<{ DocumentTypeID: number; Name: string }>>(
        Prisma.sql`
          SELECT DocumentTypeID, Name
          FROM HumanCapital.DocumentTypes
          WHERE IsActive = 1
          ORDER BY Name
        `
      );

      return NextResponse.json({ data: rows.map(r => ({ id: r.DocumentTypeID, name: r.Name })) });
    });
  },
  { bit: PERM.R }
);
