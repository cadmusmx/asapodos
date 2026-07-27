import { NextResponse } from 'next/server'

import { Prisma } from '@prisma/client'

import { PERM, withPermission, writeTransactionLog } from '@gaso/shared'

import { withTenantContext } from '@/lib/tenant-context'
import { calculateCurrentMexicanVacationPeriod } from '@/lib/human-capital/vacation-policy'
import {
    normalizeVacationBalanceFromRow,
    parseVacationBalanceGeneratePayload
} from '@/lib/human-capital/vacation-normalize'

import type {
    HumanCapitalVacationBalanceRow,
    VacationBalanceGenerationResult
} from '@/types/human-capital-vacation'

export const runtime = 'nodejs'

type EmployeeVacationSourceRow = {
    EmployeeID: number
    EmployeeName: string | null
    HireDate: Date | string | null
}

const toSqlDate = (value: string): Prisma.Sql => Prisma.sql`CAST(${value} AS date)`

const toIsoDate = (value: Date | string): string => {
    const date = value instanceof Date ? value : new Date(value)

    return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10)
}

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

export const POST = withPermission(
    'vacation',
    async (req, { auth, tenantId }) => {
        let payload

        try {
            const body = await req.json()

            payload = parseVacationBalanceGeneratePayload(body)
        } catch (error) {
            return NextResponse.json(
                { message: error instanceof Error ? error.message : 'Body inválido' },
                { status: 400 }
            )
        }

        try {
            const result = await withTenantContext(tenantId, async tx => {
                const employeeRows = await tx.$queryRaw<EmployeeVacationSourceRow[]>(
                    Prisma.sql`
            SELECT
              EmployeeID,
              CONCAT(FirstName, ' ', LastName) AS EmployeeName,
              HireDate
            FROM HumanCapital.Employees
            WHERE TenantID = CAST(${tenantId} AS uniqueidentifier)
              AND EmployeeID = ${payload.employeeId}
              AND IsActive = 1
          `
                )

                const employee = employeeRows[0]

                if (!employee) {
                    throw new Error('EMPLOYEE_NOT_FOUND')
                }

                if (!employee.HireDate) {
                    throw new Error('EMPLOYEE_WITHOUT_HIRE_DATE')
                }

                const calculation = calculateCurrentMexicanVacationPeriod(
                    employee.HireDate,
                    payload.referenceDate ?? new Date()
                )

                if (!calculation) {
                    throw new Error('EMPLOYEE_WITHOUT_COMPLETED_YEAR')
                }

                if (payload.usedDays && payload.usedDays > calculation.assignedDays) {
                    throw new Error('USED_DAYS_GREATER_THAN_ASSIGNED')
                }

                const existingRows = await tx.$queryRaw<Array<{ BalanceID: number }>>(
                    Prisma.sql`
            SELECT TOP 1 BalanceID
            FROM HumanCapital.VacationBalances
            WHERE TenantID = CAST(${tenantId} AS uniqueidentifier)
              AND EmployeeID = ${payload.employeeId}
              AND IsActive = 1
              AND PeriodStart <= ${toSqlDate(calculation.periodEnd)}
              AND PeriodEnd >= ${toSqlDate(calculation.periodStart)}
            ORDER BY PeriodStart DESC, BalanceID DESC
          `
                )

                const existingBalanceId = existingRows[0]?.BalanceID

                if (existingBalanceId) {
                    const balance = await getVacationBalanceById(tx, tenantId, existingBalanceId)

                    if (!balance) {
                        throw new Error('VACATION_BALANCE_NOT_FOUND')
                    }

                    return {
                        generated: false,
                        balance,
                        calculation: {
                            employeeId: employee.EmployeeID,
                            employeeName: employee.EmployeeName,
                            hireDate: toIsoDate(employee.HireDate),
                            yearsCompleted: calculation.yearsCompleted,
                            assignedDays: calculation.assignedDays,
                            periodStart: calculation.periodStart,
                            periodEnd: calculation.periodEnd
                        }
                    } satisfies VacationBalanceGenerationResult
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
              ${toSqlDate(calculation.periodStart)},
              ${toSqlDate(calculation.periodEnd)},
              ${calculation.assignedDays},
              ${payload.usedDays ?? 0},
              ${payload.notes ?? 'Saldo generado automáticamente con base en fecha de ingreso.'},
              1,
              ${auth.userId},
              ${auth.userId}
            )
          `
                )

                const balanceId = insertedRows[0]?.BalanceID

                if (!balanceId) {
                    throw new Error('VACATION_BALANCE_INSERT_FAILED')
                }

                const balance = await getVacationBalanceById(tx, tenantId, balanceId)

                if (!balance) {
                    throw new Error('VACATION_BALANCE_NOT_FOUND')
                }

                return {
                    generated: true,
                    balance,
                    calculation: {
                        employeeId: employee.EmployeeID,
                        employeeName: employee.EmployeeName,
                        hireDate: toIsoDate(employee.HireDate),
                        yearsCompleted: calculation.yearsCompleted,
                        assignedDays: calculation.assignedDays,
                        periodStart: calculation.periodStart,
                        periodEnd: calculation.periodEnd
                    }
                } satisfies VacationBalanceGenerationResult
            })

            if (result.generated) {
                writeTransactionLog({
                    tenantId,
                    tableName: 'HumanCapital.VacationBalances',
                    action: 'GENERATE_BALANCE',
                    userId: auth.userId,
                    appUser: auth.email ?? null,
                    oldData: null,
                    newData: result
                }).catch(() => { })
            }

            return NextResponse.json({
                data: result,
                message: result.generated
                    ? 'Saldo generado correctamente.'
                    : 'El empleado ya tiene un saldo activo para ese periodo.'
            })
        } catch (error) {
            const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR'

            if (message === 'EMPLOYEE_NOT_FOUND') {
                return NextResponse.json({ message: 'Empleado no encontrado o inactivo.' }, { status: 404 })
            }

            if (message === 'EMPLOYEE_WITHOUT_HIRE_DATE') {
                return NextResponse.json(
                    { message: 'El empleado no tiene fecha de ingreso registrada.' },
                    { status: 409 }
                )
            }

            if (message === 'EMPLOYEE_WITHOUT_COMPLETED_YEAR') {
                return NextResponse.json(
                    { message: 'El empleado aún no cumple un año de servicio.' },
                    { status: 409 }
                )
            }

            if (message === 'USED_DAYS_GREATER_THAN_ASSIGNED') {
                return NextResponse.json(
                    { message: 'Los días usados no pueden ser mayores a los días asignados legalmente.' },
                    { status: 409 }
                )
            }

            console.error('[HUMAN_CAPITAL_VACATION_BALANCE_GENERATE_ERROR]', { message })

            return NextResponse.json({ message: 'Error al generar saldo de vacaciones.' }, { status: 500 })
        }
    },
    { bit: PERM.W }
)
