import { NextResponse } from 'next/server';

import { Prisma } from '@prisma/client';

import { PERM, withPermission } from '@gaso/shared';

import { withTenantContext } from '@/lib/tenant-context';

export const runtime = 'nodejs';

// El id del empleado no es el último segmento (va antes de /contacts) → context.params.
type RouteContext = { params: Promise<{ id: string }> };

type ContactRow = {
  ContactID: number;
  Name: string;
  Phone: string | null;
  RelationshipID: number | null;
  RelationshipName: string | null;
  EsPrioritario: boolean | number;
};

const normalizeContact = (row: ContactRow) => ({
  contactId: row.ContactID,
  name: row.Name,
  phone: row.Phone ?? null,
  relationshipId: row.RelationshipID ?? null,
  relationshipName: row.RelationshipName ?? null,
  esPrioritario: Boolean(row.EsPrioritario)
});

export const GET = withPermission(
  'employees',
  async (_req, { tenantId }, context: RouteContext) => {
    const { id } = await context.params;
    const employeeId = Number(id);

    if (!Number.isInteger(employeeId) || employeeId <= 0) {
      return NextResponse.json({ message: 'Empleado inválido.' }, { status: 400 });
    }

    return withTenantContext(tenantId, async tx => {
      const rows = await tx.$queryRaw<ContactRow[]>(
        Prisma.sql`
          SELECT
            c.ContactID,
            c.Name,
            c.Phone,
            c.RelationshipID,
            r.Name AS RelationshipName,
            c.EsPrioritario
          FROM HumanCapital.EmployeeContacts c
          LEFT JOIN HumanCapital.ContactRelationships r
            ON r.RelationshipID = c.RelationshipID
          WHERE c.TenantID = CAST(${tenantId} AS uniqueidentifier)
            AND c.EmployeeID = ${employeeId}
            AND c.IsActive = 1
          ORDER BY c.EsPrioritario DESC, c.Name
        `
      );

      return NextResponse.json({ data: rows.map(normalizeContact) });
    });
  },
  { bit: PERM.R }
);
