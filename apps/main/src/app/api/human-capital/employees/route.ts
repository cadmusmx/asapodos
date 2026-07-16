import { NextResponse } from 'next/server'

import { Prisma } from '@prisma/client'

import { PERM, withPermission, writeTransactionLog } from '@gaso/shared'

import { withTenantContext } from '@/lib/tenant-context'
import {
    normalizeEmployeeFromRow,
    parseEmployeePayload
} from '@/lib/human-capital/normalize'

import type { HumanCapitalEmployeeRow } from '@/types/human-capital'

export const runtime = 'nodejs'

const getSearchPattern = (value: string | null): string | null => {
    if (!value) return null

    const trimmed = value.trim()

    if (!trimmed) return null

    const escaped = trimmed.replace(/[|%_[]/g, character => `|${character}`)

    return `%${escaped}%`
}

const toSqlDate = (value: string | null | undefined): Prisma.Sql =>
    value ? Prisma.sql`CAST(${value} AS date)` : Prisma.sql`CAST(NULL AS date)`

export const GET = withPermission(
    'employees',
    async (req, { tenantId }) => {
        const { searchParams } = new URL(req.url)

        const search = getSearchPattern(searchParams.get('search'))
        const status = searchParams.get('status')
        const activeRaw = searchParams.get('active')
        const departmentRaw = searchParams.get('departmentId')

        const pageSize = Math.min(Math.max(Number(searchParams.get('pageSize') ?? '25'), 1), 100)
        const page = Math.max(Number(searchParams.get('page') ?? '1'), 1)
        const offset = (page - 1) * pageSize

        const departmentId = departmentRaw ? Number(departmentRaw) : null
        const active = activeRaw === null ? null : activeRaw === 'true'

        return withTenantContext(tenantId, async tx => {
            const conditions: Prisma.Sql[] = []

            conditions.push(Prisma.sql`e.TenantID = CAST(${tenantId} AS uniqueidentifier)`)

            if (search) {
                conditions.push(
                    Prisma.sql`(
            e.EmployeeNumber LIKE ${search} ESCAPE '|'
            OR e.FirstName LIKE ${search} ESCAPE '|'
            OR e.LastName LIKE ${search} ESCAPE '|'
            OR e.Email LIKE ${search} ESCAPE '|'
          )`
                )
            }

            if (status) {
                conditions.push(Prisma.sql`e.EmploymentStatus = ${status}`)
            }

            if (active !== null) {
                conditions.push(Prisma.sql`e.IsActive = ${active ? 1 : 0}`)
            }

            if (departmentId !== null && Number.isInteger(departmentId) && departmentId > 0) {
                conditions.push(Prisma.sql`e.DepartmentID = ${departmentId}`)
            }

            const whereClause = Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`

            const countRows = await tx.$queryRaw<Array<{ total: bigint }>>(
                Prisma.sql`
          SELECT COUNT_BIG(1) AS total
          FROM HumanCapital.Employees e
          ${whereClause}
        `
            )

            const rows = await tx.$queryRaw<HumanCapitalEmployeeRow[]>(
                Prisma.sql`
          SELECT
            e.EmployeeID,
            e.TenantID,
            e.EmployeeNumber,
            e.FirstName,
            e.LastName,
            e.Email,
            e.Phone,
            e.DepartmentID,
            d.Name AS DepartmentName,
            e.PositionID,
            p.Name AS PositionName,
            e.EmploymentStatus,
            e.HireDate,
            e.TerminationDate,
            e.IsActive,
            e.CreatedAt,
            e.UpdatedAt,
            e.CreatedBy,
            e.UpdatedBy
          FROM HumanCapital.Employees e
          LEFT JOIN HumanCapital.Departments d
            ON d.TenantID = e.TenantID
            AND d.DepartmentID = e.DepartmentID
          LEFT JOIN HumanCapital.Positions p
            ON p.TenantID = e.TenantID
            AND p.PositionID = e.PositionID
          ${whereClause}
          ORDER BY e.CreatedAt DESC, e.EmployeeID DESC
          OFFSET ${offset} ROWS FETCH NEXT ${pageSize} ROWS ONLY
        `
            )

            return NextResponse.json({
                data: rows.map(normalizeEmployeeFromRow),
                total: Number(countRows[0]?.total ?? 0),
                page,
                pageSize
            })
        })
    },
    { bit: PERM.R }
)

export const POST = withPermission(
    'employees',
    async (req, { auth, tenantId }) => {
        let payload

        try {
            const body = await req.json()

            payload = parseEmployeePayload(body)
        } catch (error) {
            return NextResponse.json(
                { message: error instanceof Error ? error.message : 'Body inválido' },
                { status: 400 }
            )
        }

        try {
            const employee = await withTenantContext(tenantId, async tx => {
                const insertedRows = await tx.$queryRaw<Array<{ EmployeeID: number }>>(
                    Prisma.sql`
            INSERT INTO HumanCapital.Employees (
              TenantID,
              EmployeeNumber,
              FirstName,
              LastName,
              Email,
              Phone,
              DepartmentID,
              PositionID,
              EmploymentStatus,
              HireDate,
              TerminationDate,
              IsActive,
              CreatedBy,
              UpdatedBy
            )
            OUTPUT inserted.EmployeeID
            VALUES (
                CAST(${tenantId} AS uniqueidentifier),
                ${payload.employeeNumber},
                ${payload.firstName},
                ${payload.lastName},
                ${payload.email},
                ${payload.phone},
                ${payload.departmentId},
                ${payload.positionId},
                ${payload.employmentStatus},
                ${toSqlDate(payload.hireDate)},
                ${toSqlDate(payload.terminationDate)},
                ${payload.employmentStatus === 'active' ? 1 : 0},
                ${auth.userId},
                ${auth.userId}
            )
          `
                )

                const employeeId = insertedRows[0]?.EmployeeID

                if (!employeeId) {
                    throw new Error('EMPLOYEE_INSERT_FAILED')
                }

                const rows = await tx.$queryRaw<HumanCapitalEmployeeRow[]>(
                    Prisma.sql`
            SELECT
              e.EmployeeID,
              e.TenantID,
              e.EmployeeNumber,
              e.FirstName,
              e.LastName,
              e.Email,
              e.Phone,
              e.DepartmentID,
              d.Name AS DepartmentName,
              e.PositionID,
              p.Name AS PositionName,
              e.EmploymentStatus,
              e.HireDate,
              e.TerminationDate,
              e.IsActive,
              e.CreatedAt,
              e.UpdatedAt,
              e.CreatedBy,
              e.UpdatedBy
            FROM HumanCapital.Employees e
            LEFT JOIN HumanCapital.Departments d
              ON d.TenantID = e.TenantID
              AND d.DepartmentID = e.DepartmentID
            LEFT JOIN HumanCapital.Positions p
              ON p.TenantID = e.TenantID
              AND p.PositionID = e.PositionID
            WHERE e.TenantID = CAST(${tenantId} AS uniqueidentifier)
              AND e.EmployeeID = ${employeeId}
          `
                )

                return normalizeEmployeeFromRow(rows[0])
            })

            writeTransactionLog({
                tenantId,
                tableName: 'HumanCapital.Employees',
                action: 'CREATE',
                userId: auth.userId,
                appUser: auth.email ?? null,
                oldData: null,
                newData: employee
            }).catch(() => { })

            return NextResponse.json({ data: employee }, { status: 201 })
        } catch (error) {
            const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR'

            if (message.includes('UX_HC_Employees_Tenant_EmployeeNumber')) {
                return NextResponse.json({ message: 'El número de empleado ya existe.' }, { status: 409 })
            }

            if (message.includes('UX_HC_Employees_Tenant_Email')) {
                return NextResponse.json({ message: 'El correo del empleado ya existe.' }, { status: 409 })
            }

            console.error('[HUMAN_CAPITAL_EMPLOYEE_CREATE_ERROR]', { message })

            return NextResponse.json({ message: 'Error al crear empleado.' }, { status: 500 })
        }
    },
    { bit: PERM.W }
)
