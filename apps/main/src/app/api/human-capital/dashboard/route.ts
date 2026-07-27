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
    const areaId = searchParams.get('area')
    const deptId = searchParams.get('department')
    const puestoId = searchParams.get('puesto')
    const regionId = searchParams.get('region')

    const currentYear = new Date().getFullYear()

    return withTenantContext(tenantId, async () => {
      const tenantCondition = Prisma.sql`u.TenantID = CAST(${tenantId} AS uniqueidentifier) AND u.TenantID <> '00000000-0000-0000-0000-000000000000'`

      const buildConditions = (extra: Prisma.Sql[] = []) => {
        const conditions: Prisma.Sql[] = [tenantCondition, ...extra]
        if (activeParam === 'active') {
          conditions.push(Prisma.sql`u.Estatus = 'A'`)
        } else if (activeParam === 'inactive') {
          conditions.push(Prisma.sql`u.Estatus = 'I'`)
        }
        if (areaId) conditions.push(Prisma.sql`u.IdArea = ${Number(areaId)}`)
        if (deptId) conditions.push(Prisma.sql`u.IdDepartamento = ${Number(deptId)}`)
        if (puestoId) conditions.push(Prisma.sql`u.IdPuesto = ${Number(puestoId)}`)
        if (regionId) conditions.push(Prisma.sql`u.IdRegion = ${Number(regionId)}`)
        return conditions
      }

      const whereClause = (extra: Prisma.Sql[] = []) => Prisma.sql`WHERE ${Prisma.join(buildConditions(extra), ' AND ')}`

      const totalResult = await prisma.$queryRaw<Array<{ total: bigint }>>(
        Prisma.sql`SELECT COUNT_BIG(1) as total FROM GASOCO_Cat_Usuarios u ${whereClause()}`
      )
      const totalEmpleados = Number(totalResult[0]?.total ?? 0)

      const activosResult = await prisma.$queryRaw<Array<{ total: bigint }>>(
        Prisma.sql`SELECT COUNT_BIG(1) as total FROM GASOCO_Cat_Usuarios u ${whereClause([Prisma.sql`u.Estatus = 'A'`])}`
      )
      const totalActivos = Number(activosResult[0]?.total ?? 0)

      const inactivosResult = await prisma.$queryRaw<Array<{ total: bigint }>>(
        Prisma.sql`SELECT COUNT_BIG(1) as total FROM GASOCO_Cat_Usuarios u ${whereClause([Prisma.sql`u.Estatus = 'I'`])}`
      )
      const totalInactivos = Number(inactivosResult[0]?.total ?? 0)

      const altasResult = await prisma.$queryRaw<Array<{ total: bigint }>>(
        Prisma.sql`SELECT COUNT_BIG(1) as total FROM GASOCO_Cat_Usuarios u ${whereClause([Prisma.sql`u.Estatus = 'A'`, Prisma.sql`YEAR(u.FechaAlta) = ${currentYear}`])}`
      )
      const totalAltas = Number(altasResult[0]?.total ?? 0)

      const bajasResult = await prisma.$queryRaw<Array<{ total: bigint }>>(
        Prisma.sql`SELECT COUNT_BIG(1) as total FROM GASOCO_Cat_Usuarios u WHERE u.TenantID = CAST(${tenantId} AS uniqueidentifier) AND u.TenantID <> '00000000-0000-0000-0000-000000000000' AND u.Estatus = 'I' AND YEAR(u.FechaAlta) = ${currentYear}`
      )
      const totalBajas = Number(bajasResult[0]?.total ?? 0)

      const porDepartamento = await prisma.$queryRaw<CountByKey[]>(
        Prisma.sql`SELECT ISNULL(d.NombreDepartamento, 'Sin asignar') as [key], COUNT(u.IdUsuario) as [count] FROM GASOCO_Cat_Usuarios u LEFT JOIN GASOCO_RH_Departamento d ON u.IdDepartamento = d.IdDepartamento ${whereClause([Prisma.sql`u.Estatus = 'A'`])} GROUP BY d.NombreDepartamento ORDER BY [count] DESC`
      )

      const movimientosPorMes = await prisma.$queryRaw<MonthlyCount[]>(
        Prisma.sql`
        SELECT DATENAME(MONTH, u.FechaAlta) as month, CAST(YEAR(u.FechaAlta) AS VARCHAR(4)) as year, 'Alta' as type, COUNT(*) as count
        FROM GASOCO_Cat_Usuarios u
        ${whereClause([Prisma.sql`YEAR(u.FechaAlta) = ${currentYear}`])}
        GROUP BY DATENAME(MONTH, u.FechaAlta), CAST(YEAR(u.FechaAlta) AS VARCHAR(4))
        ORDER BY year, month
        `
      )

      const porRegion = await prisma.$queryRaw<CountByKey[]>(
        Prisma.sql`SELECT ISNULL(r.NombreReg, 'Sin área') as [key], COUNT(u.IdUsuario) as [count] FROM GASOCO_Cat_Usuarios u LEFT JOIN Cat_Regiones r ON u.IdRegion = r.IdReg ${whereClause([Prisma.sql`u.Estatus = 'A'`])} GROUP BY r.NombreReg ORDER BY [count] DESC`
      )

      const porPuesto = await prisma.$queryRaw<CountByKey[]>(
        Prisma.sql`SELECT TOP 20 ISNULL(p.NombrePuesto, 'Sin asignar') as [key], COUNT(u.IdUsuario) as [count] FROM GASOCO_Cat_Usuarios u LEFT JOIN GASOCO_RH_Puesto p ON u.IdPuesto = p.IdPuesto ${whereClause([Prisma.sql`u.Estatus = 'A'`])} GROUP BY p.NombrePuesto ORDER BY [count] DESC`
      )

      const antiguedad = await prisma.$queryRaw<SeniorityBucket[]>(
        Prisma.sql`
        SELECT CASE WHEN DATEDIFF(YEAR, u.FechaAlta, GETDATE()) < 1 THEN 'Menos de 1 año' WHEN DATEDIFF(YEAR, u.FechaAlta, GETDATE()) BETWEEN 1 AND 3 THEN '1-3 años' WHEN DATEDIFF(YEAR, u.FechaAlta, GETDATE()) BETWEEN 3 AND 5 THEN '3-5 años' WHEN DATEDIFF(YEAR, u.FechaAlta, GETDATE()) BETWEEN 5 AND 10 THEN '5-10 años' ELSE 'Más de 10 años' END as bucket, COUNT(*) as count
        FROM GASOCO_Cat_Usuarios u
        ${whereClause([Prisma.sql`u.Estatus = 'A'`, Prisma.sql`u.FechaAlta IS NOT NULL`])}
        GROUP BY CASE WHEN DATEDIFF(YEAR, u.FechaAlta, GETDATE()) < 1 THEN 'Menos de 1 año' WHEN DATEDIFF(YEAR, u.FechaAlta, GETDATE()) BETWEEN 1 AND 3 THEN '1-3 años' WHEN DATEDIFF(YEAR, u.FechaAlta, GETDATE()) BETWEEN 3 AND 5 THEN '3-5 años' WHEN DATEDIFF(YEAR, u.FechaAlta, GETDATE()) BETWEEN 5 AND 10 THEN '5-10 años' ELSE 'Más de 10 años' END
        ORDER BY bucket
        `
      )

      const porGenero = await prisma.$queryRaw<CountByKey[]>(
        Prisma.sql`SELECT ISNULL(s.nombreSexo, 'No especificado') as [key], COUNT(u.IdUsuario) as [count] FROM GASOCO_Cat_Usuarios u LEFT JOIN cat_sexo s ON u.idSexo = s.idSexo ${whereClause([Prisma.sql`u.Estatus = 'A'`])} GROUP BY s.nombreSexo ORDER BY [count] DESC`
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
