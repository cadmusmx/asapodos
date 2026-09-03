import { NextResponse } from 'next/server'

import { Prisma } from '@prisma/client'

import { PERM, withPermission, writeTransactionLog } from '@gaso/shared'

import { withTenantContext } from '@/lib/tenant-context'

export const runtime = 'nodejs'

// El id del empleado no es el último segmento (va antes de /contacts) → context.params.
type RouteContext = { params: Promise<{ id: string }> }

type ContactRow = {
  ContactID: number
  Name: string
  Phone: string | null
  RelationshipID: number | null
  RelationshipName: string | null
  EsPrioritario: boolean | number
}

const normalizeContact = (row: ContactRow) => ({
  contactId: row.ContactID,
  name: row.Name,
  phone: row.Phone ?? null,
  relationshipId: row.RelationshipID ?? null,
  relationshipName: row.RelationshipName ?? null,
  esPrioritario: Boolean(row.EsPrioritario)
})

// helper (antes de los exports)
type ContactPayload = { name: string; phone: string | null; relationshipId: number; esPrioritario: boolean }

const parseContactPayload = (body: unknown): ContactPayload => {
  if (typeof body !== 'object' || body === null) throw new Error('Body inválido')
  const raw = body as Record<string, unknown>
  const name = typeof raw.name === 'string' ? raw.name.trim() : ''

  if (!name) throw new Error('El nombre es obligatorio.')
  const relationshipId = Number(raw.relationshipId)

  if (!Number.isInteger(relationshipId) || relationshipId <= 0) throw new Error('El parentesco es obligatorio.')
  const phone = typeof raw.phone === 'string' && raw.phone.trim() ? raw.phone.trim() : null
  const esPrioritario = raw.esPrioritario === true

  return { name, phone, relationshipId, esPrioritario }
}

export const POST = withPermission(
  'employees',
  async (req, { auth, tenantId }, context: RouteContext) => {
    const { id } = await context.params
    const employeeId = Number(id)

    if (!Number.isInteger(employeeId) || employeeId <= 0) {
      return NextResponse.json({ message: 'Empleado inválido.' }, { status: 400 })
    }

    let payload: ContactPayload

    try {
      payload = parseContactPayload(await req.json())
    } catch (error) {
      return NextResponse.json({ message: error instanceof Error ? error.message : 'Body inválido' }, { status: 400 })
    }

    try {
      const result = await withTenantContext(tenantId, async tx => {
        const emp = await tx.$queryRaw<Array<{ EmployeeID: number }>>(
          Prisma.sql`SELECT EmployeeID FROM HumanCapital.Employees WHERE TenantID = CAST(${tenantId} AS uniqueidentifier) AND EmployeeID = ${employeeId}`
        )

        if (!emp[0]) throw new Error('EMPLOYEE_NOT_FOUND')

        const inserted = await tx.$queryRaw<Array<{ ContactID: number }>>(
          Prisma.sql`
            INSERT INTO HumanCapital.EmployeeContacts (TenantID, EmployeeID, Name, Phone, RelationshipID, EsPrioritario, CreatedBy)
            OUTPUT inserted.ContactID
            VALUES (CAST(${tenantId} AS uniqueidentifier), ${employeeId}, ${payload.name}, ${payload.phone}, ${payload.relationshipId}, ${payload.esPrioritario ? 1 : 0}, ${auth.userId})
          `
        )

        return { contactId: inserted[0]?.ContactID ?? null }
      })

      writeTransactionLog({
        tenantId,
        tableName: 'HumanCapital.EmployeeContacts',
        action: 'CREATE',
        userId: auth.userId,
        appUser: auth.email ?? null,
        oldData: null,
        newData: { contactId: result.contactId, employeeId, ...payload }
      }).catch(() => {})

      return NextResponse.json({ data: result }, { status: 201 })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR'

      if (message.includes('EMPLOYEE_NOT_FOUND'))
        return NextResponse.json({ message: 'El empleado no existe.' }, { status: 404 })
      if (message.includes('FK_EmployeeContacts_Relationship'))
        return NextResponse.json({ message: 'Parentesco inválido.' }, { status: 400 })
      console.error('[CONTACTS_CREATE_ERROR]', { message })

      return NextResponse.json({ message: 'Error al crear el contacto.' }, { status: 500 })
    }
  },
  { bit: PERM.W }
)

export const GET = withPermission(
  'employees',
  async (_req, { tenantId }, context: RouteContext) => {
    const { id } = await context.params
    const employeeId = Number(id)

    if (!Number.isInteger(employeeId) || employeeId <= 0) {
      return NextResponse.json({ message: 'Empleado inválido.' }, { status: 400 })
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
          ORDER BY c.EsPrioritario DESC, c.Name
        `
      )

      return NextResponse.json({ data: rows.map(normalizeContact) })
    })
  },
  { bit: PERM.R }
)
