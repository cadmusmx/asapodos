import { NextResponse } from 'next/server'

import { Prisma } from '@prisma/client'

import { PERM, withPermission, writeTransactionLog } from '@gaso/shared'

import { withTenantContext } from '@/lib/tenant-context'
import {
    normalizeVacationRequestFromRow,
    normalizeVacationStatus,
    parseVacationRequestPayload
} from '@/lib/human-capital/vacation-normalize'

import type {
    HumanCapitalVacationRequestRow,
    VacationRequestStatus
} from '@/types/human-capital-vacation'

export const runtime = 'nodejs'

const getPositiveInteger = (value: string | null): number | null => {
    if (!value) return null

    const parsed = Number(value)

    return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

const getStatusFilter = (value: string | null): VacationRequestStatus | 'all' => {
    if (!value || value === 'all') return 'all'

    return normalizeVacationStatus(value)
}

const toSqlDate = (value: string): Prisma.Sql => Prisma.sql`CAST(${value} AS date)`

const getVacationRequestById = async (
    tx: Parameters<Parameters<typeof withTenantContext>[1]>[0],
    tenantId: string,
    vacationRequestId: number
) => {
    const rows = await tx.$queryRaw<HumanCapitalVacationRequestRow[]>(
        Prisma.sql`
      SELECT
        r.VacationRequestID,
        r.TenantID,
        r.EmployeeID,
        CONCAT(e.FirstName, ' ', e.LastName) AS EmployeeName,
        r.StartDate,
        r.EndDate,
        r.RequestedDays,
        r.Status,
        r.Reason,
        r.ReviewComments,
        r.ReviewedBy,
        r.ReviewedAt,
        r.CancelledBy,
        r.CancelledAt,
        r.CancelReason,
        r.CreatedAt,
        r.UpdatedAt,
        r.CreatedBy,
        r.UpdatedBy
      FROM HumanCapital.VacationRequests r
      INNER JOIN HumanCapital.Employees e
        ON e.TenantID = r.TenantID
        AND e.EmployeeID = r.EmployeeID
      WHERE r.TenantID = CAST(${tenantId} AS uniqueidentifier)
        AND r.VacationRequestID = ${vacationRequestId}
    `
    )

    return rows[0] ? normalizeVacationRequestFromRow(rows[0]) : null
}

export const GET = withPermission(
    'vacation',
    async (req, { tenantId }) => {
        const { searchParams } = new URL(req.url)

        const employeeId = getPositiveInteger(searchParams.get('employeeId'))
        const status = getStatusFilter(searchParams.get('status'))

        const pageSize = Math.min(Math.max(Number(searchParams.get('pageSize') ?? '25'), 1), 100)
        const page = Math.max(Number(searchParams.get('page') ?? '1'), 1)
        const offset = (page - 1) * pageSize

        const result = await withTenantContext(tenantId, async tx => {
            const conditions: Prisma.Sql[] = [
                Prisma.sql`r.TenantID = CAST(${tenantId} AS uniqueidentifier)`
            ]

            if (employeeId) {
                conditions.push(Prisma.sql`r.EmployeeID = ${employeeId}`)
            }

            if (status !== 'all') {
                conditions.push(Prisma.sql`r.Status = ${status}`)
            }

            const whereClause = Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`

            const countRows = await tx.$queryRaw<Array<{ total: bigint }>>(
                Prisma.sql`
          SELECT COUNT_BIG(1) AS total
          FROM HumanCapital.VacationRequests r
          ${whereClause}
        `
            )

            const rows = await tx.$queryRaw<HumanCapitalVacationRequestRow[]>(
                Prisma.sql`
          SELECT
            r.VacationRequestID,
            r.TenantID,
            r.EmployeeID,
            CONCAT(e.FirstName, ' ', e.LastName) AS EmployeeName,
            r.StartDate,
            r.EndDate,
            r.RequestedDays,
            r.Status,
            r.Reason,
            r.ReviewComments,
            r.ReviewedBy,
            r.ReviewedAt,
            r.CancelledBy,
            r.CancelledAt,
            r.CancelReason,
            r.CreatedAt,
            r.UpdatedAt,
            r.CreatedBy,
            r.UpdatedBy
          FROM HumanCapital.VacationRequests r
          INNER JOIN HumanCapital.Employees e
            ON e.TenantID = r.TenantID
            AND e.EmployeeID = r.EmployeeID
          ${whereClause}
          ORDER BY r.CreatedAt DESC, r.VacationRequestID DESC
          OFFSET ${offset} ROWS FETCH NEXT ${pageSize} ROWS ONLY
        `
            )

            return {
                data: rows.map(normalizeVacationRequestFromRow),
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

            payload = parseVacationRequestPayload(body)
        } catch (error) {
            return NextResponse.json(
                { message: error instanceof Error ? error.message : 'Body inválido' },
                { status: 400 }
            )
        }

        try {
            const createdRequest = await withTenantContext(tenantId, async tx => {
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
            FROM HumanCapital.VacationRequests
            WHERE TenantID = CAST(${tenantId} AS uniqueidentifier)
              AND EmployeeID = ${payload.employeeId}
              AND Status IN ('pending', 'approved')
              AND StartDate <= ${toSqlDate(payload.endDate)}
              AND EndDate >= ${toSqlDate(payload.startDate)}
          `
                )

                if (Number(overlapRows[0]?.total ?? 0) > 0) {
                    throw new Error('VACATION_REQUEST_OVERLAP')
                }

                const balanceRows = await tx.$queryRaw<
                    Array<{
                        BalanceID: number
                        AssignedDays: number | string
                        UsedDays: number | string
                        PendingDays: number | string
                    }>
                >(
                    Prisma.sql`
            SELECT TOP 1
              b.BalanceID,
              b.AssignedDays,
              b.UsedDays,
              COALESCE(pending.PendingDays, 0) AS PendingDays
            FROM HumanCapital.VacationBalances b
            OUTER APPLY (
              SELECT COALESCE(SUM(r.RequestedDays), 0) AS PendingDays
              FROM HumanCapital.VacationRequests r
              WHERE r.TenantID = b.TenantID
                AND r.EmployeeID = b.EmployeeID
                AND r.Status = 'pending'
                AND r.StartDate <= b.PeriodEnd
                AND r.EndDate >= b.PeriodStart
            ) pending
            WHERE b.TenantID = CAST(${tenantId} AS uniqueidentifier)
              AND b.EmployeeID = ${payload.employeeId}
              AND b.IsActive = 1
              AND b.PeriodStart <= ${toSqlDate(payload.startDate)}
              AND b.PeriodEnd >= ${toSqlDate(payload.endDate)}
            ORDER BY b.PeriodStart DESC, b.BalanceID DESC
          `
                )

                const balance = balanceRows[0]

                if (!balance) {
                    throw new Error('VACATION_BALANCE_NOT_FOUND')
                }

                const assignedDays = Number(balance.AssignedDays)
                const usedDays = Number(balance.UsedDays)
                const pendingDays = Number(balance.PendingDays)
                const availableDays = Math.max(assignedDays - usedDays - pendingDays, 0)

                if (payload.requestedDays > availableDays) {
                    throw new Error('INSUFFICIENT_VACATION_BALANCE')
                }

                const insertedRows = await tx.$queryRaw<Array<{ VacationRequestID: number }>>(
                    Prisma.sql`
            INSERT INTO HumanCapital.VacationRequests (
              TenantID,
              EmployeeID,
              StartDate,
              EndDate,
              RequestedDays,
              Status,
              Reason,
              CreatedBy,
              UpdatedBy
            )
            OUTPUT inserted.VacationRequestID
            VALUES (
              CAST(${tenantId} AS uniqueidentifier),
              ${payload.employeeId},
              ${toSqlDate(payload.startDate)},
              ${toSqlDate(payload.endDate)},
              ${payload.requestedDays},
              'pending',
              ${payload.reason},
              ${auth.userId},
              ${auth.userId}
            )
          `
                )

                const vacationRequestId = insertedRows[0]?.VacationRequestID

                if (!vacationRequestId) {
                    throw new Error('VACATION_REQUEST_INSERT_FAILED')
                }

                return getVacationRequestById(tx, tenantId, vacationRequestId)
            })

            if (!createdRequest) {
                return NextResponse.json({ message: 'No se pudo crear la solicitud.' }, { status: 500 })
            }

            writeTransactionLog({
                tenantId,
                tableName: 'HumanCapital.VacationRequests',
                action: 'CREATE_REQUEST',
                userId: auth.userId,
                appUser: auth.email ?? null,
                oldData: null,
                newData: createdRequest
            }).catch(() => { })

            return NextResponse.json({ data: createdRequest }, { status: 201 })
        } catch (error) {
            const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR'

            if (message === 'EMPLOYEE_NOT_FOUND') {
                return NextResponse.json({ message: 'Empleado no encontrado o inactivo.' }, { status: 404 })
            }

            if (message === 'VACATION_REQUEST_OVERLAP') {
                return NextResponse.json(
                    { message: 'El empleado ya tiene una solicitud pendiente o aprobada en ese rango de fechas.' },
                    { status: 409 }
                )
            }

            if (message === 'VACATION_BALANCE_NOT_FOUND') {
                return NextResponse.json(
                    { message: 'El empleado no tiene saldo activo para el periodo solicitado.' },
                    { status: 409 }
                )
            }

            if (message === 'INSUFFICIENT_VACATION_BALANCE') {
                return NextResponse.json(
                    { message: 'El empleado no tiene días disponibles suficientes.' },
                    { status: 409 }
                )
            }

            console.error('[HUMAN_CAPITAL_VACATION_REQUEST_CREATE_ERROR]', { message })

            return NextResponse.json({ message: 'Error al crear solicitud de vacaciones.' }, { status: 500 })
        }
    },
    { bit: PERM.W }
)
