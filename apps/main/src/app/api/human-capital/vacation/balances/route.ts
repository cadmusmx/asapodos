import { NextResponse } from 'next/server'

import { Prisma } from '@prisma/client'

import { PERM, withPermission, writeTransactionLog } from '@gaso/shared'

import { withTenantContext } from '@/lib/tenant-context'
import {
    normalizeVacationBalanceFromRow,
    parseVacationBalancePayload
} from '@/lib/human-capital/vacation-normalize'

import type { HumanCapitalVacationBalanceRow } from '@/types/human-capital-vacation'

export const runtime = 'nodejs'

const getPositiveInteger = (value: string | null): number | null => {
    if (!value) return null

    const parsed = Number(value)

    return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

const toSqlDate = (value: string): Prisma.Sql => Prisma.sql`CAST(${value} AS date)`

const getVacationBalanceById = async (
    tx: Parameters<Parameters<typeof withTenantContext>[1]>[0],
    tenantId: string,
    balanceId: number
) => {
    const rows = await tx.$queryRaw<HumanCapitalVacationBalanceRow[]>(
        Prisma.sql`
      SELECT
        b.BalanceID,
        b.TenantID,
        b.EmployeeID,
        CONCAT(e.FirstName, ' ', e.LastName) AS EmployeeName,
        b.PeriodStart,
        b.PeriodEnd,
        b.AssignedDays,
        b.UsedDays,
        pending.PendingDays,
        CASE
          WHEN b.AssignedDays - b.UsedDays - pending.PendingDays < 0 THEN 0
          ELSE b.AssignedDays - b.UsedDays - pending.PendingDays
        END AS AvailableDays,
        b.Notes,
        b.IsActive,
        b.CreatedAt,
        b.UpdatedAt,
        b.CreatedBy,
        b.UpdatedBy
      FROM HumanCapital.VacationBalances b
      INNER JOIN HumanCapital.Employees e
        ON e.TenantID = b.TenantID
        AND e.EmployeeID = b.EmployeeID
      OUTER APPLY (
        SELECT COALESCE(SUM(vr.RequestedDays), 0) AS PendingDays
        FROM HumanCapital.VacationRequests vr
        WHERE vr.TenantID = b.TenantID
          AND vr.EmployeeID = b.EmployeeID
          AND vr.Status = 'pending'
          AND vr.StartDate <= b.PeriodEnd
          AND vr.EndDate >= b.PeriodStart
      ) pending
      WHERE b.TenantID = CAST(${tenantId} AS uniqueidentifier)
        AND b.BalanceID = ${balanceId}
    `
    )

    return rows[0] ? normalizeVacationBalanceFromRow(rows[0]) : null
}

export const GET = withPermission(
    'vacation',
    async (req, { tenantId }) => {
        const { searchParams } = new URL(req.url)

        const employeeId = getPositiveInteger(searchParams.get('employeeId'))
        const activeRaw = searchParams.get('active')

        const pageSize = Math.min(Math.max(Number(searchParams.get('pageSize') ?? '25'), 1), 100)
        const page = Math.max(Number(searchParams.get('page') ?? '1'), 1)
        const offset = (page - 1) * pageSize
        const active = activeRaw === null ? true : activeRaw === 'true'

        const result = await withTenantContext(tenantId, async tx => {
            const conditions: Prisma.Sql[] = [
                Prisma.sql`b.TenantID = CAST(${tenantId} AS uniqueidentifier)`
            ]

            if (employeeId) {
                conditions.push(Prisma.sql`b.EmployeeID = ${employeeId}`)
            }

            if (activeRaw !== 'all') {
                conditions.push(Prisma.sql`b.IsActive = ${active ? 1 : 0}`)
            }

            const whereClause = Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`

            const countRows = await tx.$queryRaw<Array<{ total: bigint }>>(
                Prisma.sql`
          SELECT COUNT_BIG(1) AS total
          FROM HumanCapital.VacationBalances b
          ${whereClause}
        `
            )

            const rows = await tx.$queryRaw<HumanCapitalVacationBalanceRow[]>(
                Prisma.sql`
          SELECT
            b.BalanceID,
            b.TenantID,
            b.EmployeeID,
            CONCAT(e.FirstName, ' ', e.LastName) AS EmployeeName,
            b.PeriodStart,
            b.PeriodEnd,
            b.AssignedDays,
            b.UsedDays,
            pending.PendingDays,
            CASE
              WHEN b.AssignedDays - b.UsedDays - pending.PendingDays < 0 THEN 0
              ELSE b.AssignedDays - b.UsedDays - pending.PendingDays
            END AS AvailableDays,
            b.Notes,
            b.IsActive,
            b.CreatedAt,
            b.UpdatedAt,
            b.CreatedBy,
            b.UpdatedBy
          FROM HumanCapital.VacationBalances b
          INNER JOIN HumanCapital.Employees e
            ON e.TenantID = b.TenantID
            AND e.EmployeeID = b.EmployeeID
          OUTER APPLY (
            SELECT COALESCE(SUM(vr.RequestedDays), 0) AS PendingDays
            FROM HumanCapital.VacationRequests vr
            WHERE vr.TenantID = b.TenantID
              AND vr.EmployeeID = b.EmployeeID
              AND vr.Status = 'pending'
              AND vr.StartDate <= b.PeriodEnd
              AND vr.EndDate >= b.PeriodStart
          ) pending
          ${whereClause}
          ORDER BY b.PeriodStart DESC, b.BalanceID DESC
          OFFSET ${offset} ROWS FETCH NEXT ${pageSize} ROWS ONLY
        `
            )

            return {
                data: rows.map(normalizeVacationBalanceFromRow),
                total: Number(countRows[0]?.total ?? 0),
                page,
                pageSize
            }
        })

        return NextResponse.json(result)
    },
    { bit: PERM.R }
)

export const POST = withPermission(
    'vacation',
    async (req, { auth, tenantId }) => {
        let payload

        try {
            const body = await req.json()

            payload = parseVacationBalancePayload(body)
        } catch (error) {
            return NextResponse.json(
                { message: error instanceof Error ? error.message : 'Body inválido' },
                { status: 400 }
            )
        }

        try {
            const createdBalance = await withTenantContext(tenantId, async tx => {
                const employeeRows = await tx.$queryRaw<Array<{ EmployeeID: number }>>(
                    Prisma.sql`
            SELECT EmployeeID
            FROM HumanCapital.Employees
            WHERE TenantID = CAST(${tenantId} AS uniqueidentifier)
              AND EmployeeID = ${payload.employeeId}
              AND IsActive = 1
          `
                )

                if (!employeeRows[0]) {
                    throw new Error('EMPLOYEE_NOT_FOUND')
                }

                const overlapRows = await tx.$queryRaw<Array<{ total: bigint }>>(
                    Prisma.sql`
            SELECT COUNT_BIG(1) AS total
            FROM HumanCapital.VacationBalances
            WHERE TenantID = CAST(${tenantId} AS uniqueidentifier)
              AND EmployeeID = ${payload.employeeId}
              AND IsActive = 1
              AND PeriodStart <= ${toSqlDate(payload.periodEnd)}
              AND PeriodEnd >= ${toSqlDate(payload.periodStart)}
          `
                )

                if (Number(overlapRows[0]?.total ?? 0) > 0) {
                    throw new Error('VACATION_BALANCE_OVERLAP')
                }

                const insertedRows = await tx.$queryRaw<Array<{ BalanceID: number }>>(
                    Prisma.sql`
            INSERT INTO HumanCapital.VacationBalances (
              TenantID,
              EmployeeID,
              PeriodStart,
              PeriodEnd,
              AssignedDays,
              UsedDays,
              Notes,
              IsActive,
              CreatedBy,
              UpdatedBy
            )
            OUTPUT inserted.BalanceID
            VALUES (
              CAST(${tenantId} AS uniqueidentifier),
              ${payload.employeeId},
              ${toSqlDate(payload.periodStart)},
              ${toSqlDate(payload.periodEnd)},
              ${payload.assignedDays},
              ${payload.usedDays ?? 0},
              ${payload.notes},
              ${payload.isActive === false ? 0 : 1},
              ${auth.userId},
              ${auth.userId}
            )
          `
                )

                const balanceId = insertedRows[0]?.BalanceID

                if (!balanceId) {
                    throw new Error('VACATION_BALANCE_INSERT_FAILED')
                }

                return getVacationBalanceById(tx, tenantId, balanceId)
            })

            if (!createdBalance) {
                return NextResponse.json({ message: 'No se pudo crear el saldo.' }, { status: 500 })
            }

            writeTransactionLog({
                tenantId,
                tableName: 'HumanCapital.VacationBalances',
                action: 'CREATE_BALANCE',
                userId: auth.userId,
                appUser: auth.email ?? null,
                oldData: null,
                newData: createdBalance
            }).catch(() => { })

            return NextResponse.json({ data: createdBalance }, { status: 201 })
        } catch (error) {
            const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR'

            if (message === 'EMPLOYEE_NOT_FOUND') {
                return NextResponse.json({ message: 'Empleado no encontrado o inactivo.' }, { status: 404 })
            }

            if (message === 'VACATION_BALANCE_OVERLAP') {
                return NextResponse.json(
                    { message: 'El empleado ya tiene un saldo activo que cruza con ese periodo.' },
                    { status: 409 }
                )
            }

            if (message.includes('UX_HC_VacationBalances_Tenant_Employee_Period')) {
                return NextResponse.json(
                    { message: 'Ya existe un saldo activo para ese empleado y periodo.' },
                    { status: 409 }
                )
            }

            console.error('[HUMAN_CAPITAL_VACATION_BALANCE_CREATE_ERROR]', { message })

            return NextResponse.json({ message: 'Error al crear saldo de vacaciones.' }, { status: 500 })
        }
    },
    { bit: PERM.W }
)
