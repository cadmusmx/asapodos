/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable padding-line-between-statements */
/* eslint-disable newline-before-return */

import { NextResponse } from 'next/server'

import { Prisma } from '@prisma/client'

import { PERM, withPermission } from '@gaso/shared'

import { withTenantContext } from '@/lib/tenant-context'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

type CountByKey = { key: string; count: number }
type MonthlyCount = { month: string; year: string; type: string; count: number }
type SeniorityBucket = { bucket: string; count: number }

export const GET = withPermission(
  'dashboard_hum_cap',
  async (req, { tenantId }) => {
    const { searchParams } = new URL(req.url)

    const activeParam = searchParams.get('active')
    const deptId = searchParams.get('department')
    const puestoId = searchParams.get('puesto')
    const regionId = searchParams.get('region')

    const currentYear = new Date().getFullYear()

    return withTenantContext(tenantId, async () => {
      const tenantCondition = Prisma.sql`e.TenantID = CAST(${tenantId} AS uniqueidentifier) AND e.TenantID <> '00000000-0000-0000-0000-000000000000'`

      // Base común: Employees + expediente 1:1 (LEFT JOIN → empleado sin EmployeeData no desaparece).
      // EmployeeData va SIEMPRE porque el filtro de región (ed.RegionID) puede aplicar a cualquier query.
      const employeeBase = Prisma.sql`
        FROM HumanCapital.Employees e
        LEFT JOIN HumanCapital.EmployeeData ed
          ON ed.TenantID = e.TenantID AND ed.EmployeeID = e.EmployeeID`

      const buildConditions = (extra: Prisma.Sql[] = []) => {
        const conditions: Prisma.Sql[] = [tenantCondition, ...extra]
        if (activeParam === 'active') {
          conditions.push(Prisma.sql`e.IsActive = 1`)
        } else if (activeParam === 'inactive') {
          conditions.push(Prisma.sql`e.IsActive = 0`)
        }
        if (deptId) conditions.push(Prisma.sql`e.DepartmentID = ${Number(deptId)}`)
        if (puestoId) conditions.push(Prisma.sql`e.PositionID = ${Number(puestoId)}`)
        if (regionId) conditions.push(Prisma.sql`ed.RegionID = ${Number(regionId)}`)
        return conditions
      }

      const whereClause = (extra: Prisma.Sql[] = []) => Prisma.sql`WHERE ${Prisma.join(buildConditions(extra), ' AND ')}`

      const totalResult = await prisma.$queryRaw<Array<{ total: bigint }>>(
        Prisma.sql`SELECT COUNT_BIG(1) as total ${employeeBase} ${whereClause()}`
      )
      const totalEmpleados = Number(totalResult[0]?.total ?? 0)

      const activosResult = await prisma.$queryRaw<Array<{ total: bigint }>>(
        Prisma.sql`SELECT COUNT_BIG(1) as total ${employeeBase} ${whereClause([Prisma.sql`e.IsActive = 1`])}`
      )
      const totalActivos = Number(activosResult[0]?.total ?? 0)

      const inactivosResult = await prisma.$queryRaw<Array<{ total: bigint }>>(
        Prisma.sql`SELECT COUNT_BIG(1) as total ${employeeBase} ${whereClause([Prisma.sql`e.IsActive = 0`])}`
      )
      const totalInactivos = Number(inactivosResult[0]?.total ?? 0)

      // Altas/bajas = eventos por fecha (independientes de IsActive actual), simétricos.
      const altasResult = await prisma.$queryRaw<Array<{ total: bigint }>>(
        Prisma.sql`SELECT COUNT_BIG(1) as total ${employeeBase} ${whereClause([Prisma.sql`YEAR(e.HireDate) = ${currentYear}`])}`
      )
      const totalAltas = Number(altasResult[0]?.total ?? 0)

      const bajasResult = await prisma.$queryRaw<Array<{ total: bigint }>>(
        Prisma.sql`SELECT COUNT_BIG(1) as total ${employeeBase} ${whereClause([Prisma.sql`e.TerminationDate IS NOT NULL`, Prisma.sql`YEAR(e.TerminationDate) = ${currentYear}`])}`
      )
      const totalBajas = Number(bajasResult[0]?.total ?? 0)

      const porDepartamento = await prisma.$queryRaw<CountByKey[]>(
        Prisma.sql`
        SELECT ISNULL(d.Name, 'Sin asignar') as [key], COUNT(e.EmployeeID) as [count]
        ${employeeBase}
        LEFT JOIN HumanCapital.Departments d ON d.TenantID = e.TenantID AND d.DepartmentID = e.DepartmentID
        ${whereClause([Prisma.sql`e.IsActive = 1`])}
        GROUP BY d.Name
        ORDER BY [count] DESC`
      )

      const movimientosPorMes = await prisma.$queryRaw<MonthlyCount[]>(
        Prisma.sql`
        SELECT DATENAME(MONTH, e.HireDate) as month, CAST(YEAR(e.HireDate) AS VARCHAR(4)) as year, 'Alta' as type, COUNT(*) as count
        ${employeeBase}
        ${whereClause([Prisma.sql`YEAR(e.HireDate) = ${currentYear}`])}
        GROUP BY DATENAME(MONTH, e.HireDate), CAST(YEAR(e.HireDate) AS VARCHAR(4))
        UNION ALL
        SELECT DATENAME(MONTH, e.TerminationDate) as month, CAST(YEAR(e.TerminationDate) AS VARCHAR(4)) as year, 'Baja' as type, COUNT(*) as count
        ${employeeBase}
        ${whereClause([Prisma.sql`e.TerminationDate IS NOT NULL`, Prisma.sql`YEAR(e.TerminationDate) = ${currentYear}`])}
        GROUP BY DATENAME(MONTH, e.TerminationDate), CAST(YEAR(e.TerminationDate) AS VARCHAR(4))
        ORDER BY year, month`
      )

      const porRegion = await prisma.$queryRaw<CountByKey[]>(
        Prisma.sql`
        SELECT ISNULL(r.NombreReg, 'Sin área') as [key], COUNT(e.EmployeeID) as [count]
        ${employeeBase}
        LEFT JOIN Cat_Regiones r ON r.IdReg = ed.RegionID
        ${whereClause([Prisma.sql`e.IsActive = 1`])}
        GROUP BY r.NombreReg
        ORDER BY [count] DESC`
      )

      const porPuesto = await prisma.$queryRaw<CountByKey[]>(
        Prisma.sql`
        SELECT TOP 20 ISNULL(p.Name, 'Sin asignar') as [key], COUNT(e.EmployeeID) as [count]
        ${employeeBase}
        LEFT JOIN HumanCapital.Positions p ON p.TenantID = e.TenantID AND p.PositionID = e.PositionID
        ${whereClause([Prisma.sql`e.IsActive = 1`])}
        GROUP BY p.Name
        ORDER BY [count] DESC`
      )

      const antiguedad = await prisma.$queryRaw<SeniorityBucket[]>(
        Prisma.sql`
        SELECT CASE WHEN DATEDIFF(YEAR, e.HireDate, GETDATE()) < 1 THEN 'Menos de 1 año' WHEN DATEDIFF(YEAR, e.HireDate, GETDATE()) BETWEEN 1 AND 3 THEN '1-3 años' WHEN DATEDIFF(YEAR, e.HireDate, GETDATE()) BETWEEN 3 AND 5 THEN '3-5 años' WHEN DATEDIFF(YEAR, e.HireDate, GETDATE()) BETWEEN 5 AND 10 THEN '5-10 años' ELSE 'Más de 10 años' END as bucket, COUNT(*) as count
        ${employeeBase}
        ${whereClause([Prisma.sql`e.IsActive = 1`, Prisma.sql`e.HireDate IS NOT NULL`])}
        GROUP BY CASE WHEN DATEDIFF(YEAR, e.HireDate, GETDATE()) < 1 THEN 'Menos de 1 año' WHEN DATEDIFF(YEAR, e.HireDate, GETDATE()) BETWEEN 1 AND 3 THEN '1-3 años' WHEN DATEDIFF(YEAR, e.HireDate, GETDATE()) BETWEEN 3 AND 5 THEN '3-5 años' WHEN DATEDIFF(YEAR, e.HireDate, GETDATE()) BETWEEN 5 AND 10 THEN '5-10 años' ELSE 'Más de 10 años' END
        ORDER BY bucket`
      )

      const porGenero = await prisma.$queryRaw<CountByKey[]>(
        Prisma.sql`
        SELECT ISNULL(s.nombreSexo, 'No especificado') as [key], COUNT(e.EmployeeID) as [count]
        ${employeeBase}
        LEFT JOIN cat_sexo s ON s.idSexo = ed.SexoID
        ${whereClause([Prisma.sql`e.IsActive = 1`])}
        GROUP BY s.nombreSexo
        ORDER BY [count] DESC`
      )

      return NextResponse.json({
        ok: true,
        data: {
          counters: {
            totalEmpleados,
            totalActivos,
            totalInactivos,
            totalAltas,
            totalBajas
          },
          porDepartamento,
          movimientosPorMes,
          porRegion,
          porPuesto,
          antiguedad,
          porGenero
        }
      })
    })
  },
  { bit: PERM.R }
)
