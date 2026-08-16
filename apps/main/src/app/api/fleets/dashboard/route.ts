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
type StatusData = { key: string; count: number }
type FleetTableRow = { key: string; count: number; monto: number }
type FleetInsights = {
  topUnit: { label: string; value: number } | null
  topType: { label: string; value: number } | null
  topResponsible: { label: string; value: number } | null
  pending: number
}

export const GET = withPermission(
  'dashboard_veh',
  async (req, { tenantId }) => {
    try {
      const { searchParams } = new URL(req.url)

      const fechaInicio = searchParams.get('fechaInicio')
      const fechaFin = searchParams.get('fechaFin')
      const rawTipo = searchParams.getAll('tipoGasto')
      const rawResponsable = searchParams.getAll('responsable')
      const rawEstatus = searchParams.getAll('estatus')
      const yearParam = searchParams.get('year')
      const year = yearParam ? Number(yearParam) : new Date().getFullYear()

      const parseMulti = (vals: string[]): number[] =>
        vals.flatMap(v => v.split(',')).map(Number).filter(n => !isNaN(n) && n > 0)

      const tipoArr = parseMulti(rawTipo)
      const responsableArr = parseMulti(rawResponsable)

      return await withTenantContext(tenantId, async (tx) => {
        const tenantCondition = Prisma.sql`1 = 1`

        const buildWhere = (extra: Prisma.Sql[] = []) => {
          const conditions: Prisma.Sql[] = [tenantCondition, ...extra]
          if (fechaInicio && fechaFin) {
            conditions.push(Prisma.sql`g.Fecha BETWEEN CAST(${fechaInicio} AS date) AND CAST(${fechaFin} AS date)`)
          } else {
            conditions.push(Prisma.sql`YEAR(g.Fecha) = ${year}`)
          }
          return Prisma.join(conditions, ' AND ')
        }

        const baseWhere = buildWhere()

        const countersResult = await prisma.$queryRaw<Array<{
          gastoTotal: number
          solicitado: number
          unidades: number
          solicitudes: number
          diferencia: number
        }>>(
          Prisma.sql`
            SELECT
              ISNULL(SUM(g.Costo), 0) as gastoTotal,
              ISNULL(SUM(g.CostoSolicitado), 0) as solicitado,
              COUNT(DISTINCT g.noEconomico) as unidades,
              COUNT_BIG(1) as solicitudes,
              ISNULL(SUM(g.DiferenciaCosto), 0) as diferencia
            FROM GASOGASTOVEH g
            WHERE ${baseWhere}
          `
        )

        const counters = countersResult[0]

        const monthlyKm = await prisma.$queryRaw<MonthlyData[]>(
          Prisma.sql`
            SELECT
              DATENAME(MONTH, g.Fecha) as month,
              CAST(YEAR(g.Fecha) AS VARCHAR(4)) as year,
              COUNT_BIG(1) as count,
              ISNULL(SUM(g.Costo), 0) as monto
            FROM GASOGASTOVEH g
            WHERE ${baseWhere}
            GROUP BY DATENAME(MONTH, g.Fecha), CAST(YEAR(g.Fecha) AS VARCHAR(4))
            ORDER BY year, DATENAME(MONTH, g.Fecha)
          `
        )

        const statusData = await prisma.$queryRaw<StatusData[]>(
          Prisma.sql`
            SELECT
              CASE g.EstatusSolicitud
                WHEN 1 THEN 'Aceptada'
                WHEN 2 THEN 'Rechazada'
                WHEN 4 THEN 'Pagada'
                WHEN 5 THEN 'Facturada'
                ELSE 'Pendiente'
              END as [key],
              COUNT_BIG(1) as count
            FROM GASOGASTOVEH g
            WHERE ${baseWhere}
            GROUP BY g.EstatusSolicitud
          `
        )

        const topUnits = await prisma.$queryRaw<FleetTableRow[]>(
          Prisma.sql`
            SELECT TOP 10
              CAST(g.noEconomico AS VARCHAR(20)) as [key],
              COUNT_BIG(1) as count,
              ISNULL(SUM(g.Costo), 0) as monto
            FROM GASOGASTOVEH g
            WHERE ${baseWhere}
            GROUP BY g.noEconomico
            ORDER BY monto DESC
          `
        )

        const buildTipoWhere = () => {
          const conditions: Prisma.Sql[] = [tenantCondition]
          if (fechaInicio && fechaFin) {
            conditions.push(Prisma.sql`g.Fecha BETWEEN CAST(${fechaInicio} AS date) AND CAST(${fechaFin} AS date)`)
          } else {
            conditions.push(Prisma.sql`YEAR(g.Fecha) = ${year}`)
          }
          if (tipoArr.length > 0) {
            const inList = tipoArr.map(n => Prisma.sql`${n}`).join(', ')
            conditions.push(Prisma.sql`g.IdSolicitud IN (${inList})`)
          }
          return Prisma.join(conditions, ' AND ')
        }

        const porTipo = await prisma.$queryRaw<FleetTableRow[]>(
          Prisma.sql`
            SELECT TOP 8
              ISNULL(s.NombreSolicitud, 'No Especificado') as [key],
              COUNT_BIG(1) as count,
              ISNULL(SUM(g.Costo), 0) as monto
            FROM GASOGASTOVEH g
            LEFT JOIN GASOGASTOVEH_Cat_Solicitud s ON g.IdSolicitud = s.IdSolicitud
            WHERE ${buildTipoWhere()}
            GROUP BY s.NombreSolicitud
            ORDER BY monto DESC
          `
        )

        const buildRespWhere = () => {
          const conditions: Prisma.Sql[] = [tenantCondition]
          if (fechaInicio && fechaFin) {
            conditions.push(Prisma.sql`g.Fecha BETWEEN CAST(${fechaInicio} AS date) AND CAST(${fechaFin} AS date)`)
          } else {
            conditions.push(Prisma.sql`YEAR(g.Fecha) = ${year}`)
          }
          if (responsableArr.length > 0) {
            const inList = responsableArr.map(n => Prisma.sql`${n}`).join(', ')
            conditions.push(Prisma.sql`g.IdResposable IN (${inList})`)
          }
          return Prisma.join(conditions, ' AND ')
        }

        const porResponsable = await prisma.$queryRaw<FleetTableRow[]>(
          Prisma.sql`
            SELECT TOP 8
              ISNULL(r.NombreResposable, 'No Especificado') as [key],
              COUNT_BIG(1) as count,
              ISNULL(SUM(g.Costo), 0) as monto
            FROM GASOGASTOVEH g
            LEFT JOIN GASOGASTOVEH_Cat_Responsable r ON g.IdResposable = r.IdResposable
            WHERE ${buildRespWhere()}
            GROUP BY r.NombreResposable
            ORDER BY monto DESC
          `
        )

        const porTaller = await prisma.$queryRaw<FleetTableRow[]>(
          Prisma.sql`
            SELECT TOP 8
              ISNULL(t.NombreTaller, 'No Especificado') as [key],
              COUNT_BIG(1) as count,
              ISNULL(SUM(g.Costo), 0) as monto
            FROM GASOGASTOVEH g
            LEFT JOIN GASOCO_Cat_Talleres t ON g.IdTaller = t.IdTaller
            WHERE ${baseWhere}
            GROUP BY t.NombreTaller
            ORDER BY monto DESC
          `
        )

        const unitsTable = await prisma.$queryRaw<FleetTableRow[]>(
          Prisma.sql`
            SELECT TOP 12
              CAST(g.noEconomico AS VARCHAR(20)) as [key],
              COUNT_BIG(1) as count,
              ISNULL(SUM(g.Costo), 0) as monto
            FROM GASOGASTOVEH g
            WHERE ${baseWhere}
            GROUP BY g.noEconomico
            ORDER BY monto DESC
          `
        )

        const facturadoPagadoTable = await prisma.$queryRaw<FleetTableRow[]>(
          Prisma.sql`
            SELECT
              CASE g.EstatusSolicitud
                WHEN 1 THEN 'Aceptada'
                WHEN 2 THEN 'Rechazada'
                WHEN 4 THEN 'Pagada'
                WHEN 5 THEN 'Facturada'
                ELSE 'Pendiente'
              END as [key],
              COUNT_BIG(1) as count,
              ISNULL(SUM(g.Costo), 0) as monto
            FROM GASOGASTOVEH g
            WHERE ${baseWhere}
            GROUP BY g.EstatusSolicitud
            ORDER BY CASE g.EstatusSolicitud
              WHEN 5 THEN 1
              WHEN 4 THEN 2
              WHEN 1 THEN 3
              WHEN 3 THEN 4
              WHEN 2 THEN 5
              ELSE 6 END
          `
        )

        const allRows = await prisma.$queryRaw<Array<{
          noEconomico: number | null
          Costo: number | null
          CostoSolicitado: number | null
          DiferenciaCosto: number | null
          IdSolicitud: number | null
          IdResposable: number | null
          EstatusSolicitud: number | null
        }>>(
          Prisma.sql`
            SELECT g.noEconomico, g.Costo, g.CostoSolicitado, g.DiferenciaCosto, g.IdSolicitud, g.IdResposable, g.EstatusSolicitud
            FROM GASOGASTOVEH g
            WHERE ${baseWhere}
          `
        )

        const insights = computeInsights(allRows)

        return NextResponse.json({
          ok: true,
          data: {
            counters: {
              gastoTotal: Number(counters?.gastoTotal ?? 0),
              solicitado: Number(counters?.solicitado ?? 0),
              unidades: Number(counters?.unidades ?? 0),
              promedio: Number(counters?.unidades ?? 0) > 0
                ? Number(counters?.gastoTotal ?? 0) / Number(counters?.unidades)
                : 0,
              solicitudes: Number(counters?.solicitudes ?? 0),
              diferencia: Number(counters?.diferencia ?? 0)
            },
            monthlyKm: monthlyKm.map(r => ({ month: r.month, year: r.year, count: Number(r.count), monto: Number(r.monto) })),
            statusData: statusData.map(r => ({ key: r.key, count: Number(r.count) })),
            porUnidad: topUnits.map(r => ({ key: r.key, count: Number(r.count), monto: Number(r.monto) })),
            porTipo: porTipo.map(r => ({ key: r.key, count: Number(r.count), monto: Number(r.monto) })),
            porResponsable: porResponsable.map(r => ({ key: r.key, count: Number(r.count), monto: Number(r.monto) })),
            porTaller: porTaller.map(r => ({ key: r.key, count: Number(r.count), monto: Number(r.monto) })),
            unitsTable: unitsTable.map(r => ({ key: r.key, count: Number(r.count), monto: Number(r.monto) })),
            facturadoPagado: facturadoPagadoTable.map(r => ({ key: r.key, count: Number(r.count), monto: Number(r.monto) })),
            insights
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

function computeInsights(rows: Array<{
  noEconomico: number | null
  Costo: number | null
  CostoSolicitado: number | null
  DiferenciaCosto: number | null
  IdSolicitud: number | null
  IdResposable: number | null
  EstatusSolicitud: number | null
}>): FleetInsights {
  const unitMap: Record<string, number> = {}
  const typeMap: Record<string, number> = {}
  const respMap: Record<string, number> = {}
  let pending = 0

  for (const row of rows) {
    const costo = Number(row.Costo) || 0

    const unidad = String(row.noEconomico ?? 'Sin unidad')
    unitMap[unidad] = (unitMap[unidad] || 0) + costo

    if (row.EstatusSolicitud === 3 || row.EstatusSolicitud == null) pending++

    if (typeMap['Tipo-' + row.IdSolicitud] !== undefined) {
      typeMap['Tipo-' + row.IdSolicitud] += costo
    } else {
      typeMap['Tipo-' + row.IdSolicitud] = costo
    }

    if (respMap['Resposable-' + row.IdResposable] !== undefined) {
      respMap['Resposable-' + row.IdResposable] += costo
    } else {
      respMap['Resposable-' + row.IdResposable] = costo
    }
  }

  const topUnit = Object.entries(unitMap).sort((a, b) => b[1] - a[1])[0] || null
  const topType = Object.entries(typeMap).sort((a, b) => b[1] - a[1])[0] || null
  const topResponsible = Object.entries(respMap).sort((a, b) => b[1] - a[1])[0] || null

  return {
    topUnit: topUnit ? { label: topUnit[0], value: topUnit[1] } : null,
    topType: topType ? { label: topType[0].replace('Tipo-', ''), value: topType[1] } : null,
    topResponsible: topResponsible ? { label: topResponsible[0].replace('Resposable-', ''), value: topResponsible[1] } : null,
    pending
  }
}
