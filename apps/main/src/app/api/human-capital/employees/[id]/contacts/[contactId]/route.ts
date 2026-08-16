import { NextResponse } from 'next/server';

import { Prisma } from '@prisma/client';

import { PERM, withPermission, writeTransactionLog } from '@gaso/shared';

import { withTenantContext } from '@/lib/tenant-context';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string; contactId: string }> };

type ContactPayload = {
  name: string;
  phone: string | null;
  relationshipId: number;
  esPrioritario: boolean;
};

const parseContactPayload = (body: unknown): ContactPayload => {
  if (typeof body !== 'object' || body === null) {
    throw new Error('Body inválido');
  }

  const raw = body as Record<string, unknown>;

  const name = typeof raw.name === 'string' ? raw.name.trim() : '';

  if (!name) throw new Error('El nombre es obligatorio.');

  const relationshipId = Number(raw.relationshipId);

  if (!Number.isInteger(relationshipId) || relationshipId <= 0) {
    throw new Error('El parentesco es obligatorio.');
  }

  const phone = typeof raw.phone === 'string' && raw.phone.trim() ? raw.phone.trim() : null;
  const esPrioritario = raw.esPrioritario === true;

  return { name, phone, relationshipId, esPrioritario };
};

const resolveIds = async (context: RouteContext) => {
  const { id, contactId } = await context.params;

  return { employeeId: Number(id), contactId: Number(contactId) };
};

export const PATCH = withPermission(
  'employees',
  async (req, { auth, tenantId }, context: RouteContext) => {
    const { employeeId, contactId } = await resolveIds(context);

    if (!Number.isInteger(employeeId) || employeeId <= 0 || !Number.isInteger(contactId) || contactId <= 0) {
      return NextResponse.json({ message: 'Parámetros inválidos.' }, { status: 400 });
    }

    let payload: ContactPayload;

    try {
      payload = parseContactPayload(await req.json());
    } catch (error) {
      return NextResponse.json(
        { message: error instanceof Error ? error.message : 'Body inválido' },
        { status: 400 }
      );
    }

    try {
      const affected = await withTenantContext(tenantId, async tx =>
        tx.$executeRaw(
          Prisma.sql`
            UPDATE HumanCapital.EmployeeContacts
            SET Name = ${payload.name},
                Phone = ${payload.phone},
                RelationshipID = ${payload.relationshipId},
                EsPrioritario = ${payload.esPrioritario ? 1 : 0},
                UpdatedAt = SYSUTCDATETIME(),
                UpdatedBy = ${auth.userId}
            WHERE TenantID = CAST(${tenantId} AS uniqueidentifier)
              AND EmployeeID = ${employeeId}
              AND ContactID = ${contactId}
              AND IsActive = 1
          `
        )
      );

      if (!affected) {
        return NextResponse.json({ message: 'Contacto no encontrado.' }, { status: 404 });
      }

      writeTransactionLog({
        tenantId,
        tableName: 'HumanCapital.EmployeeContacts',
        action: 'UPDATE',
        userId: auth.userId,
        appUser: auth.email ?? null,
        oldData: null,
        newData: { contactId, employeeId, ...payload }
      }).catch(() => { });

      return NextResponse.json({ data: { contactId } });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR';

      if (message.includes('FK_EmployeeContacts_Relationship')) {
        return NextResponse.json({ message: 'Parentesco inválido.' }, { status: 400 });
      }

      console.error('[CONTACTS_UPDATE_ERROR]', { message });

      return NextResponse.json({ message: 'Error al actualizar el contacto.' }, { status: 500 });
    }
  },
  { bit: PERM.U }
);

export const DELETE = withPermission(
  'employees',
  async (_req, { auth, tenantId }, context: RouteContext) => {
    const { employeeId, contactId } = await resolveIds(context);

    if (!Number.isInteger(employeeId) || employeeId <= 0 || !Number.isInteger(contactId) || contactId <= 0) {
      return NextResponse.json({ message: 'Parámetros inválidos.' }, { status: 400 });
    }

    const deleted = await withTenantContext(tenantId, async tx => {
      const existing = await tx.$queryRaw<Array<{ ContactID: number; Name: string; Phone: string | null; RelationshipID: number | null; EsPrioritario: boolean | number }>>(
        Prisma.sql`
          SELECT ContactID, Name, Phone, RelationshipID, EsPrioritario
          FROM HumanCapital.EmployeeContacts
          WHERE TenantID = CAST(${tenantId} AS uniqueidentifier) AND EmployeeID = ${employeeId} AND ContactID = ${contactId}
        `);

      const row = existing[0];

      if (!row) return null;
      await tx.$executeRaw(
        Prisma.sql`DELETE FROM HumanCapital.EmployeeContacts WHERE TenantID = CAST(${tenantId} AS uniqueidentifier) AND EmployeeID = ${employeeId} AND ContactID = ${contactId}`
      );

      return row;
    });

    if (!deleted) return NextResponse.json({ message: 'Contacto no encontrado.' }, { status: 404 });


    writeTransactionLog({
      tenantId,
      tableName: 'HumanCapital.EmployeeContacts',
      action: 'DELETE',
      userId: auth.userId,
      appUser: auth.email ?? null,
      oldData: deleted,
      newData: null
    }).catch(() => { });

    return NextResponse.json({ data: { contactId } });
  },
  { bit: PERM.D }
);
