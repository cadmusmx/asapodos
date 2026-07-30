/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable padding-line-between-statements */
/* eslint-disable newline-before-return */

import { NextResponse } from 'next/server'

import { Prisma } from '@prisma/client'

import { PERM, withPermission } from '@gaso/shared'

import { withTenantContext } from '@/lib/tenant-context'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

type MonthlyData = { month: string; year: string; count: number; monto: number }

export const GET = withPermission(
  'dashboard_veh',
  async (req, { tenantId }) => {
    try {
      const { searchParams } = new URL(req.url)

      const fechaInicio = searchParams.get('fechaInicio')
      const fechaFin = searchParams.get('fechaFin')
      const estatus = searchParams.get('estatus')

      const currentYear = new Date().getFullYear()

      return await withTenantContext(tenantId, async () => {
        const dateConditions: Prisma.Sql[] = []

        if (fechaInicio && fechaFin) {
          dateConditions.push(Prisma.sql`FechaCaptura BETWEEN CAST(${fechaInicio} AS date) AND CAST(${fechaFin} AS date)`)
        } else {
          dateConditions.push(Prisma.sql`YEAR(FechaCaptura) = ${currentYear}`)
        }

        const dateWhere = Prisma.join(dateConditions, ' AND ')

        const totalVehiclesResult = await prisma.$queryRaw<Array<{ total: bigint }>>(
          Prisma.sql`SELECT COUNT_BIG(1) as total FROM GASOAUTOS_Cat_Autos ${estatus ? Prisma.sql`WHERE estatus = ${Number(estatus)}` : Prisma.sql``}`
        )
        const totalVehicles = totalVehiclesResult[0]

        const activeVehiclesResult = await prisma.$queryRaw<Array<{ active: bigint }>>(
          Prisma.sql`SELECT COUNT_BIG(1) as active FROM GASOAUTOS_Cat_Autos WHERE estatus = 1`
        )
        const activeVehicles = activeVehiclesResult[0]

        const inactiveVehiclesResult = await prisma.$queryRaw<Array<{ inactive: bigint }>>(
          Prisma.sql`SELECT COUNT_BIG(1) as inactive FROM GASOAUTOS_Cat_Autos WHERE estatus != 1 OR estatus IS NULL`
        )
        const inactiveVehicles = inactiveVehiclesResult[0]

        const totalKmsResult = await prisma.$queryRaw<Array<{ totalKms: bigint }>>(
          Prisma.sql`SELECT ISNULL(SUM(KmUnidad), 0) as totalKms FROM GASOAUTOS_Kmsemanal WHERE ${dateWhere}`
        )
        const totalKms = totalKmsResult[0]

        const totalFuelResult = await prisma.$queryRaw<Array<{ totalFuel: bigint }>>(
          Prisma.sql`SELECT ISNULL(SUM(Monto), 0) as totalFuel FROM GASOAL_Gasolina WHERE ${dateWhere}`
        )
        const totalFuel = totalFuelResult[0]

        const monthlyKm = await prisma.$queryRaw<MonthlyData[]>(
          Prisma.sql`SELECT DATENAME(MONTH, k.FechaCaptura) as month, CAST(YEAR(k.FechaCaptura) AS VARCHAR(4)) as year, COUNT(*) as count, ISNULL(SUM(k.KmUnidad), 0) as monto FROM GASOAUTOS_Kmsemanal k WHERE ${dateWhere} GROUP BY DATENAME(MONTH, k.FechaCaptura), CAST(YEAR(k.FechaCaptura) AS VARCHAR(4)) ORDER BY year, DATENAME(MONTH, k.FechaCaptura)`
        )

        const fuelData = await prisma.$queryRaw<MonthlyData[]>(
          Prisma.sql`SELECT DATENAME(MONTH, g.FechaCaptura) as month, CAST(YEAR(g.FechaCaptura) AS VARCHAR(4)) as year, COUNT(*) as count, ISNULL(SUM(g.Monto), 0) as monto FROM GASOAL_Gasolina g WHERE ${dateWhere} GROUP BY DATENAME(MONTH, g.FechaCaptura), CAST(YEAR(g.FechaCaptura) AS VARCHAR(4)) ORDER BY year, DATENAME(MONTH, g.FechaCaptura)`
        )

        const porVehiculo = await prisma.$queryRaw<Array<{ key: string; count: bigint; km: bigint }>>(
          Prisma.sql`SELECT TOP 10 k.NoEconomico as [key], COUNT(*) as [count], ISNULL(SUM(k.KmUnidad), 0) as km FROM GASOAUTOS_Kmsemanal k WHERE ${dateWhere} GROUP BY k.NoEconomico ORDER BY [count] DESC`
        )

        const porRegion = await prisma.$queryRaw<Array<{ key: string; count: bigint; monto: bigint }>>(
          Prisma.sql`SELECT TOP 10 ISNULL(r.NombreReg, 'Sin asignar') as [key], COUNT(*) as [count], ISNULL(SUM(g.Monto), 0) as monto FROM GASOAL_Gasolina g LEFT JOIN Cat_Regiones r ON g.IdRegion = r.IdReg WHERE ${dateWhere} GROUP BY r.NombreReg ORDER BY [count] DESC`
        )

        return NextResponse.json({
          ok: true,
          data: {
            counters: {
              total: Number(totalVehicles?.total ?? 0),
              active: Number(activeVehicles?.active ?? 0),
              inactive: Number(inactiveVehicles?.inactive ?? 0),
              totalKms: Number(totalKms?.totalKms ?? 0),
              totalFuel: Number(totalFuel?.totalFuel ?? 0)
            },
            monthlyKm,
            fuelData,
            porVehiculo: porVehiculo.map(v => ({ key: String(v.key), count: Number(v.count), km: Number(v.km) })),
            porRegion: porRegion.map(r => ({ key: r.key || 'Sin asignar', count: Number(r.count), monto: Number(r.monto) }))
          }
        })
      })
    } catch (e) {
      console.error('[fleets/dashboard] Error:', e)
      return NextResponse.json({ error: (e as Error).message }, { status: 500 })
    }
  },
  { bit: PERM.R }
)
