import { NextResponse } from 'next/server'

import { Prisma } from '@prisma/client'

import { PERM, withPermission, writeTransactionLog } from '@gaso/shared'

import { withTenantContext } from '@/lib/tenant-context'
import { normalizeEmployeeFromRow, parseEmployeePayload } from '@/lib/human-capital/normalize'

import type { HumanCapitalEmployeeRow } from '@/types/human-capital'

export const runtime = 'nodejs'

const getEmployeeIdFromRequest = (req: Request): number | null => {
    const pathname = new URL(req.url).pathname
    const idRaw = pathname.split('/').filter(Boolean).pop()
    const id = Number(idRaw)

    return Number.isInteger(id) && id > 0 ? id : null
}

const toSqlDate = (value: string | null | undefined): Prisma.Sql =>
    value ? Prisma.sql`CAST(${value} AS date)` : Prisma.sql`CAST(NULL AS date)`

const getEmployeeById = async (
    tx: Parameters<Parameters<typeof withTenantContext>[1]>[0],
    tenantId: string,
    employeeId: number
) => {
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

    return rows[0] ? normalizeEmployeeFromRow(rows[0]) : null
}

export const PUT = withPermission(
    'employees',
    async (req, { auth, tenantId }) => {
        const employeeId = getEmployeeIdFromRequest(req)

        if (!employeeId) {
            return NextResponse.json({ message: 'Empleado inválido.' }, { status: 400 })
        }

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
            const result = await withTenantContext(tenantId, async tx => {
                const oldEmployee = await getEmployeeById(tx, tenantId, employeeId)

                if (!oldEmployee) {
                    return null
                }

                await tx.$executeRaw(
                    Prisma.sql`
            UPDATE HumanCapital.Employees
            SET
                EmployeeNumber = ${payload.employeeNumber},
                FirstName = ${payload.firstName},
                LastName = ${payload.lastName},
                Email = ${payload.email},
                Phone = ${payload.phone},
                DepartmentID = ${payload.departmentId},
                PositionID = ${payload.positionId},
                EmploymentStatus = ${payload.employmentStatus},
                HireDate = ${toSqlDate(payload.hireDate)},
                TerminationDate = ${toSqlDate(payload.terminationDate)},
                IsActive = ${payload.employmentStatus === 'active' ? 1 : 0},
                UpdatedAt = SYSUTCDATETIME(),
                UpdatedBy = ${auth.userId}
            WHERE TenantID = CAST(${tenantId} AS uniqueidentifier)
              AND EmployeeID = ${employeeId}
          `
                )

                const newEmployee = await getEmployeeById(tx, tenantId, employeeId)

                return {
                    oldEmployee,
                    newEmployee
                }
            })

            if (!result?.newEmployee) {
                return NextResponse.json({ message: 'Empleado no encontrado.' }, { status: 404 })
            }

            writeTransactionLog({
                tenantId,
                tableName: 'HumanCapital.Employees',
                action: 'UPDATE',
                userId: auth.userId,
                appUser: auth.email ?? null,
                oldData: result.oldEmployee,
                newData: result.newEmployee
            }).catch(() => { })

            return NextResponse.json({ data: result.newEmployee })
        } catch (error) {
            const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR'

            if (message.includes('UX_HC_Employees_Tenant_EmployeeNumber')) {
                return NextResponse.json({ message: 'El número de empleado ya existe.' }, { status: 409 })
            }

            if (message.includes('UX_HC_Employees_Tenant_Email')) {
                return NextResponse.json({ message: 'El correo del empleado ya existe.' }, { status: 409 })
            }

            console.error('[HUMAN_CAPITAL_EMPLOYEE_UPDATE_ERROR]', { message })

            return NextResponse.json({ message: 'Error al actualizar empleado.' }, { status: 500 })
        }
    },
    { bit: PERM.U }
)

export const DELETE = withPermission(
    'employees',
    async (req, { auth, tenantId }) => {
        const employeeId = getEmployeeIdFromRequest(req)

        if (!employeeId) {
            return NextResponse.json({ message: 'Empleado inválido.' }, { status: 400 })
        }

        try {
            const result = await withTenantContext(tenantId, async tx => {
                const oldEmployee = await getEmployeeById(tx, tenantId, employeeId)

                if (!oldEmployee) {
                    return null
                }

                await tx.$executeRaw(
                    Prisma.sql`
            UPDATE HumanCapital.Employees
            SET
              IsActive = 0,
              EmploymentStatus = 'inactive',
              UpdatedAt = SYSUTCDATETIME(),
              UpdatedBy = ${auth.userId}
            WHERE TenantID = CAST(${tenantId} AS uniqueidentifier)
              AND EmployeeID = ${employeeId}
          `
                )

                const newEmployee = await getEmployeeById(tx, tenantId, employeeId)

                return {
                    oldEmployee,
                    newEmployee
                }
            })

            if (!result?.newEmployee) {
                return NextResponse.json({ message: 'Empleado no encontrado.' }, { status: 404 })
            }

            writeTransactionLog({
                tenantId,
                tableName: 'HumanCapital.Employees',
                action: 'DEACTIVATE',
                userId: auth.userId,
                appUser: auth.email ?? null,
                oldData: result.oldEmployee,
                newData: result.newEmployee
            }).catch(() => { })

            return NextResponse.json({ data: result.newEmployee })
        } catch (error) {
            const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR'

            console.error('[HUMAN_CAPITAL_EMPLOYEE_DEACTIVATE_ERROR]', { message })

            return NextResponse.json({ message: 'Error al desactivar empleado.' }, { status: 500 })
        }
    },
    { bit: PERM.D }
)
