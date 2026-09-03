import { NextResponse } from 'next/server'

import { Prisma } from '@prisma/client'

import { PERM, withPermission, writeTransactionLog } from '@gaso/shared'

import { withTenantContext } from '@/lib/tenant-context'
import { normalizeVacationBalanceFromRow, parseVacationBalancePayload } from '@/lib/human-capital/vacation-normalize'

import type { HumanCapitalVacationBalanceRow } from '@/types/human-capital-vacation'

export const runtime = 'nodejs'

const getBalanceIdFromRequest = (req: Request): number | null => {
  const pathname = new URL(req.url).pathname
  const idRaw = pathname.split('/').filter(Boolean).pop()
  const id = Number(idRaw)

  return Number.isInteger(id) && id > 0 ? id : null
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

export const PUT = withPermission(
  'vacation',
  async (req, { auth, tenantId }) => {
    const balanceId = getBalanceIdFromRequest(req)

    if (!balanceId) {
      return NextResponse.json({ message: 'Saldo inválido.' }, { status: 400 })
    }

    let payload

    try {
      const body = await req.json()

      payload = parseVacationBalancePayload(body)
    } catch (error) {
      return NextResponse.json({ message: error instanceof Error ? error.message : 'Body inválido' }, { status: 400 })
    }

    try {
      const result = await withTenantContext(tenantId, async tx => {
        const oldBalance = await getVacationBalanceById(tx, tenantId, balanceId)

        if (!oldBalance) {
          throw new Error('VACATION_BALANCE_NOT_FOUND')
        }

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
              AND BalanceID <> ${balanceId}
              AND IsActive = 1
              AND PeriodStart <= ${toSqlDate(payload.periodEnd)}
              AND PeriodEnd >= ${toSqlDate(payload.periodStart)}
          `
        )

        if (Number(overlapRows[0]?.total ?? 0) > 0) {
          throw new Error('VACATION_BALANCE_OVERLAP')
        }

        const approvedRows = await tx.$queryRaw<Array<{ ApprovedDays: number | string }>>(
          Prisma.sql`
            SELECT COALESCE(SUM(RequestedDays), 0) AS ApprovedDays
            FROM HumanCapital.VacationRequests
            WHERE TenantID = CAST(${tenantId} AS uniqueidentifier)
              AND EmployeeID = ${payload.employeeId}
              AND Status = 'approved'
              AND StartDate <= ${toSqlDate(payload.periodEnd)}
              AND EndDate >= ${toSqlDate(payload.periodStart)}
          `
        )

        const approvedDays = Number(approvedRows[0]?.ApprovedDays ?? 0)

        if (payload.usedDays !== undefined && payload.usedDays < approvedDays) {
          throw new Error('USED_DAYS_LESS_THAN_APPROVED')
        }

        await tx.$executeRaw(
          Prisma.sql`
            UPDATE HumanCapital.VacationBalances
            SET
              EmployeeID = ${payload.employeeId},
              PeriodStart = ${toSqlDate(payload.periodStart)},
              PeriodEnd = ${toSqlDate(payload.periodEnd)},
              AssignedDays = ${payload.assignedDays},
              UsedDays = ${payload.usedDays ?? 0},
              Notes = ${payload.notes},
              IsActive = ${payload.isActive === false ? 0 : 1},
              UpdatedAt = SYSUTCDATETIME(),
              UpdatedBy = ${auth.userId}
            WHERE TenantID = CAST(${tenantId} AS uniqueidentifier)
              AND BalanceID = ${balanceId}
          `
        )

        const newBalance = await getVacationBalanceById(tx, tenantId, balanceId)

        return {
          oldBalance,
          newBalance
        }
      })

      if (!result.newBalance) {
        return NextResponse.json({ message: 'Saldo no encontrado.' }, { status: 404 })
      }

      writeTransactionLog({
        tenantId,
        tableName: 'HumanCapital.VacationBalances',
        action: 'UPDATE_BALANCE',
        userId: auth.userId,
        appUser: auth.email ?? null,
        oldData: result.oldBalance,
        newData: result.newBalance
      }).catch(() => {})

      return NextResponse.json({ data: result.newBalance })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR'

      if (message === 'VACATION_BALANCE_NOT_FOUND') {
        return NextResponse.json({ message: 'Saldo no encontrado.' }, { status: 404 })
      }

      if (message === 'EMPLOYEE_NOT_FOUND') {
        return NextResponse.json({ message: 'Empleado no encontrado o inactivo.' }, { status: 404 })
      }

      if (message === 'VACATION_BALANCE_OVERLAP') {
        return NextResponse.json(
          { message: 'El empleado ya tiene un saldo activo que cruza con ese periodo.' },
          { status: 409 }
        )
      }

      if (message === 'USED_DAYS_LESS_THAN_APPROVED') {
        return NextResponse.json(
          { message: 'Los días usados no pueden ser menores a los días ya aprobados.' },
          { status: 409 }
        )
      }

      console.error('[HUMAN_CAPITAL_VACATION_BALANCE_UPDATE_ERROR]', { message })

      return NextResponse.json({ message: 'Error al actualizar saldo de vacaciones.' }, { status: 500 })
    }
  },
  { bit: PERM.U }
)

export const DELETE = withPermission(
  'vacation',
  async (req, { auth, tenantId }) => {
    const balanceId = getBalanceIdFromRequest(req)

    if (!balanceId) {
      return NextResponse.json({ message: 'Saldo inválido.' }, { status: 400 })
    }

    try {
      const result = await withTenantContext(tenantId, async tx => {
        const oldBalance = await getVacationBalanceById(tx, tenantId, balanceId)

        if (!oldBalance) {
          throw new Error('VACATION_BALANCE_NOT_FOUND')
        }

        await tx.$executeRaw(
          Prisma.sql`
            UPDATE HumanCapital.VacationBalances
            SET
              IsActive = 0,
              UpdatedAt = SYSUTCDATETIME(),
              UpdatedBy = ${auth.userId}
            WHERE TenantID = CAST(${tenantId} AS uniqueidentifier)
              AND BalanceID = ${balanceId}
          `
        )

        const newBalance = await getVacationBalanceById(tx, tenantId, balanceId)

        return {
          oldBalance,
          newBalance
        }
      })

      if (!result.newBalance) {
        return NextResponse.json({ message: 'Saldo no encontrado.' }, { status: 404 })
      }

      writeTransactionLog({
        tenantId,
        tableName: 'HumanCapital.VacationBalances',
        action: 'DEACTIVATE_BALANCE',
        userId: auth.userId,
        appUser: auth.email ?? null,
        oldData: result.oldBalance,
        newData: result.newBalance
      }).catch(() => {})

      return NextResponse.json({ data: result.newBalance })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR'

      if (message === 'VACATION_BALANCE_NOT_FOUND') {
        return NextResponse.json({ message: 'Saldo no encontrado.' }, { status: 404 })
      }

      console.error('[HUMAN_CAPITAL_VACATION_BALANCE_DEACTIVATE_ERROR]', { message })

      return NextResponse.json({ message: 'Error al desactivar saldo de vacaciones.' }, { status: 500 })
    }
  },
  { bit: PERM.D }
)
