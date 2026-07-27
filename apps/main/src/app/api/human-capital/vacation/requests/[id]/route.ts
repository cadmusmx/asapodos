import { NextResponse } from 'next/server'

import { Prisma } from '@prisma/client'

import { PERM, withPermission, writeTransactionLog } from '@gaso/shared'

import { withTenantContext } from '@/lib/tenant-context'
import {
    normalizeVacationRequestFromRow,
    parseVacationReviewPayload
} from '@/lib/human-capital/vacation-normalize'

import type { HumanCapitalVacationRequestRow } from '@/types/human-capital-vacation'

export const runtime = 'nodejs'

const getVacationRequestIdFromRequest = (req: Request): number | null => {
    const pathname = new URL(req.url).pathname
    const idRaw = pathname.split('/').filter(Boolean).pop()
    const id = Number(idRaw)

    return Number.isInteger(id) && id > 0 ? id : null
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

export const PATCH = withPermission(
    'vacation',
    async (req, { auth, tenantId }) => {
        const vacationRequestId = getVacationRequestIdFromRequest(req)

        if (!vacationRequestId) {
            return NextResponse.json({ message: 'Solicitud inválida.' }, { status: 400 })
        }

        let payload

        try {
            const body = await req.json()

            payload = parseVacationReviewPayload(body)
        } catch (error) {
            return NextResponse.json(
                { message: error instanceof Error ? error.message : 'Body inválido' },
                { status: 400 }
            )
        }

        try {
            const result = await withTenantContext(tenantId, async tx => {
                const oldRequest = await getVacationRequestById(tx, tenantId, vacationRequestId)

                if (!oldRequest) {
                    throw new Error('VACATION_REQUEST_NOT_FOUND')
                }

                if (oldRequest.status !== 'pending') {
                    throw new Error('VACATION_REQUEST_NOT_PENDING')
                }

                if (payload.action === 'approve') {
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
                  AND r.VacationRequestID <> ${vacationRequestId}
                  AND r.StartDate <= b.PeriodEnd
                  AND r.EndDate >= b.PeriodStart
              ) pending
              WHERE b.TenantID = CAST(${tenantId} AS uniqueidentifier)
                AND b.EmployeeID = ${oldRequest.employeeId}
                AND b.IsActive = 1
                AND b.PeriodStart <= ${toSqlDate(oldRequest.startDate)}
                AND b.PeriodEnd >= ${toSqlDate(oldRequest.endDate)}
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

                    if (oldRequest.requestedDays > availableDays) {
                        throw new Error('INSUFFICIENT_VACATION_BALANCE')
                    }

                    await tx.$executeRaw(
                        Prisma.sql`
              UPDATE HumanCapital.VacationRequests
              SET
                Status = 'approved',
                ReviewComments = ${payload.comments},
                ReviewedBy = ${auth.userId},
                ReviewedAt = SYSUTCDATETIME(),
                UpdatedAt = SYSUTCDATETIME(),
                UpdatedBy = ${auth.userId}
              WHERE TenantID = CAST(${tenantId} AS uniqueidentifier)
                AND VacationRequestID = ${vacationRequestId}
                AND Status = 'pending'
            `
                    )

                    await tx.$executeRaw(
                        Prisma.sql`
              UPDATE HumanCapital.VacationBalances
              SET
                UsedDays = UsedDays + ${oldRequest.requestedDays},
                UpdatedAt = SYSUTCDATETIME(),
                UpdatedBy = ${auth.userId}
              WHERE TenantID = CAST(${tenantId} AS uniqueidentifier)
                AND BalanceID = ${balance.BalanceID}
            `
                    )
                }

                if (payload.action === 'reject') {
                    await tx.$executeRaw(
                        Prisma.sql`
              UPDATE HumanCapital.VacationRequests
              SET
                Status = 'rejected',
                ReviewComments = ${payload.comments},
                ReviewedBy = ${auth.userId},
                ReviewedAt = SYSUTCDATETIME(),
                UpdatedAt = SYSUTCDATETIME(),
                UpdatedBy = ${auth.userId}
              WHERE TenantID = CAST(${tenantId} AS uniqueidentifier)
                AND VacationRequestID = ${vacationRequestId}
                AND Status = 'pending'
            `
                    )
                }

                if (payload.action === 'cancel') {
                    await tx.$executeRaw(
                        Prisma.sql`
              UPDATE HumanCapital.VacationRequests
              SET
                Status = 'cancelled',
                CancelReason = ${payload.comments},
                CancelledBy = ${auth.userId},
                CancelledAt = SYSUTCDATETIME(),
                UpdatedAt = SYSUTCDATETIME(),
                UpdatedBy = ${auth.userId}
              WHERE TenantID = CAST(${tenantId} AS uniqueidentifier)
                AND VacationRequestID = ${vacationRequestId}
                AND Status = 'pending'
            `
                    )
                }

                const newRequest = await getVacationRequestById(tx, tenantId, vacationRequestId)

                return {
                    oldRequest,
                    newRequest
                }
            })

            if (!result.newRequest) {
                return NextResponse.json({ message: 'Solicitud no encontrada.' }, { status: 404 })
            }

            const auditAction =
                payload.action === 'approve'
                    ? 'APPROVE_REQUEST'
                    : payload.action === 'reject'
                        ? 'REJECT_REQUEST'
                        : 'CANCEL_REQUEST'

            writeTransactionLog({
                tenantId,
                tableName: 'HumanCapital.VacationRequests',
                action: auditAction,
                userId: auth.userId,
                appUser: auth.email ?? null,
                oldData: result.oldRequest,
                newData: result.newRequest
            }).catch(() => { })

            return NextResponse.json({ data: result.newRequest })
        } catch (error) {
            const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR'

            if (message === 'VACATION_REQUEST_NOT_FOUND') {
                return NextResponse.json({ message: 'Solicitud no encontrada.' }, { status: 404 })
            }

            if (message === 'VACATION_REQUEST_NOT_PENDING') {
                return NextResponse.json(
                    { message: 'Solo se pueden aprobar, rechazar o cancelar solicitudes pendientes.' },
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

            console.error('[HUMAN_CAPITAL_VACATION_REQUEST_REVIEW_ERROR]', { message })

            return NextResponse.json({ message: 'Error al actualizar solicitud de vacaciones.' }, { status: 500 })
        }
    },
    { bit: PERM.U }
)
