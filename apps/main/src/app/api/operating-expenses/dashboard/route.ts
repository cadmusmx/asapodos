/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable padding-line-between-statements */
/* eslint-disable newline-before-return */

import { NextResponse } from 'next/server'

import { Prisma } from '@prisma/client'

import { PERM, withPermission } from '@gaso/shared'

import { withTenantContext } from '@/lib/tenant-context'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

type MonthlyByDeptData = { month: string; year: string; dept: string; monto: number }
type MonthlyByStatusData = { month: string; year: string; status: string; monto: number }
type TableRow = { key: string; count: number; importe: number; facturada: number; pagada: number }
type InsightData = {
  topProject: { label: string; value: number } | null
  topType: { label: string; value: number } | null
  topApplicant: { label: string; value: number } | null
  pending: number
}

export const GET = withPermission(
  'dashboard_ope_exp',
  async (req, { tenantId }) => {
    try {
      const { searchParams } = new URL(req.url)

      const fechaInicio = searchParams.get('fechaInicio')
      const fechaFin = searchParams.get('fechaFin')
      const rawProyecto = searchParams.getAll('proyecto')
      const rawTipoGasto = searchParams.getAll('tipoGasto')
      const rawDepartamento = searchParams.getAll('departamento')
      const rawSolicitante = searchParams.getAll('solicitante')
      const yearParam = searchParams.get('year')
      const year = yearParam ? Number(yearParam) : new Date().getFullYear()

      const parseMulti = (vals: string[]): number[] =>
        vals
          .flatMap(v => v.split(','))
          .map(Number)
          .filter(n => !isNaN(n) && n > 0)

      const proyectoArr = parseMulti(rawProyecto)
      const tipoGastoArr = parseMulti(rawTipoGasto)
      const departamentoArr = parseMulti(rawDepartamento)
      const solicitanteArr = parseMulti(rawSolicitante)

      return await withTenantContext(tenantId, async () => {
        const tenantCondition = Prisma.sql`g.TenantID = CAST(${tenantId} AS uniqueidentifier) AND g.TenantID <> '00000000-0000-0000-0000-000000000000'`

        const buildWhere = (extra: Prisma.Sql[] = []) => {
          const conditions: Prisma.Sql[] = [tenantCondition, ...extra]
          if (fechaInicio && fechaFin) {
            conditions.push(
              Prisma.sql`g.FechaSolicitud BETWEEN CAST(${fechaInicio} AS date) AND CAST(${fechaFin} AS date)`
            )
          } else {
            conditions.push(Prisma.sql`YEAR(g.FechaSolicitud) = ${year}`)
          }
          return Prisma.join(conditions, ' AND ')
        }

        const baseWhere = buildWhere()

        const countersResult = await prisma.$queryRaw<
          Array<{
            total: bigint
            facturada: number
            pagada: number
            pendiente: number
            aceptada: number
            rechazada: number
          }>
        >(
          Prisma.sql`
            SELECT
              COUNT_BIG(1) as total,
              ISNULL(SUM(CASE WHEN g.EstatusSolicitud = 5 THEN g.MontoSolicitado ELSE 0 END), 0) as facturada,
              ISNULL(SUM(CASE WHEN g.EstatusSolicitud = 4 THEN g.MontoSolicitado ELSE 0 END), 0) as pagada,
              ISNULL(SUM(CASE WHEN g.EstatusSolicitud NOT IN (1,2,4,5) THEN g.MontoSolicitado ELSE 0 END), 0) as pendiente,
              ISNULL(SUM(CASE WHEN g.EstatusSolicitud = 1 THEN g.MontoSolicitado ELSE 0 END), 0) as aceptada,
              ISNULL(SUM(CASE WHEN g.EstatusSolicitud = 2 THEN g.MontoSolicitado ELSE 0 END), 0) as rechazada
            FROM GASOSOL_SolGastos g
            WHERE ${baseWhere}
          `
        )

        const counters = countersResult[0]

        const monthlyByDeptResult = await prisma.$queryRaw<MonthlyByDeptData[]>(
          Prisma.sql`
            SELECT
              DATENAME(MONTH, g.FechaSolicitud) as month,
              CAST(YEAR(g.FechaSolicitud) AS VARCHAR(4)) as year,
              ISNULL(j.departamentoText, 'No Especificado') as dept,
              SUM(ISNULL(j.monto, g.MontoSolicitado)) as monto
            FROM GASOSOL_SolGastos g
            CROSS APPLY OPENJSON(g.ConceptoSolicitud)
              WITH (
                departamento INT '$.departamento',
                departamentoText NVARCHAR(MAX) '$.departamentoText',
                monto FLOAT '$.monto'
              ) AS j
            WHERE ${baseWhere}
            GROUP BY DATENAME(MONTH, g.FechaSolicitud), CAST(YEAR(g.FechaSolicitud) AS VARCHAR(4)), ISNULL(j.departamentoText, 'No Especificado')
            ORDER BY year, DATENAME(MONTH, g.FechaSolicitud)
          `
        )

        const monthlyByStatusResult = await prisma.$queryRaw<MonthlyByStatusData[]>(
          Prisma.sql`
            SELECT
              DATENAME(MONTH, g.FechaSolicitud) as month,
              CAST(YEAR(g.FechaSolicitud) AS VARCHAR(4)) as year,
              CASE g.EstatusSolicitud
                WHEN 1 THEN 'Aceptada'
                WHEN 2 THEN 'Rechazada'
                WHEN 4 THEN 'Pagada'
                WHEN 5 THEN 'Facturada'
                ELSE 'Pendiente'
              END as status,
              SUM(g.MontoSolicitado) as monto
            FROM GASOSOL_SolGastos g
            WHERE ${baseWhere}
            GROUP BY DATENAME(MONTH, g.FechaSolicitud), CAST(YEAR(g.FechaSolicitud) AS VARCHAR(4)), g.EstatusSolicitud
            ORDER BY year, DATENAME(MONTH, g.FechaSolicitud)
          `
        )

        const buildDeptWhere = () => {
          const conditions: Prisma.Sql[] = [tenantCondition]
          if (fechaInicio && fechaFin) {
            conditions.push(
              Prisma.sql`g.FechaSolicitud BETWEEN CAST(${fechaInicio} AS date) AND CAST(${fechaFin} AS date)`
            )
          } else {
            conditions.push(Prisma.sql`YEAR(g.FechaSolicitud) = ${year}`)
          }
          if (departamentoArr.length > 0) {
            const inList = departamentoArr.map(n => Prisma.sql`${n}`).join(', ')
            conditions.push(Prisma.sql`j.departamento IN (${inList})`)
          }
          return Prisma.join(conditions, ' AND ')
        }

        const deptWhere = buildDeptWhere()
        const porDepartamentoResult = await prisma.$queryRaw<TableRow[]>(
          Prisma.sql`
            SELECT
              ISNULL(j.departamentoText, 'No Especificado') as [key],
              COUNT(DISTINCT g.Id) as [count],
              SUM(ISNULL(j.monto, 0)) as importe,
              SUM(CASE WHEN g.EstatusSolicitud = 5 THEN (ISNULL(j.monto, 0) / NULLIF(g.MontoSolicitado, 0)) * NULLIF(g.cantidadFactura, 0) ELSE 0 END) as facturada,
              SUM(CASE WHEN g.EstatusSolicitud = 4 THEN (ISNULL(j.monto, 0) / NULLIF(g.MontoSolicitado, 0)) * NULLIF(g.cantidadFactura, 0) ELSE 0 END) as pagada
            FROM GASOSOL_SolGastos g
            CROSS APPLY OPENJSON(g.ConceptoSolicitud)
              WITH (
                departamento INT '$.departamento',
                departamentoText NVARCHAR(MAX) '$.departamentoText',
                monto FLOAT '$.monto'
              ) AS j
            WHERE ${deptWhere}
            GROUP BY ISNULL(j.departamentoText, 'No Especificado')
            ORDER BY importe DESC
          `
        )

        const buildTipoWhere = () => {
          const conditions: Prisma.Sql[] = [tenantCondition]
          if (fechaInicio && fechaFin) {
            conditions.push(
              Prisma.sql`g.FechaSolicitud BETWEEN CAST(${fechaInicio} AS date) AND CAST(${fechaFin} AS date)`
            )
          } else {
            conditions.push(Prisma.sql`YEAR(g.FechaSolicitud) = ${year}`)
          }
          if (tipoGastoArr.length > 0) {
            const inList = tipoGastoArr.map(n => Prisma.sql`${n}`).join(', ')
            conditions.push(Prisma.sql`j.tipoSolicitud IN (${inList})`)
          }
          return Prisma.join(conditions, ' AND ')
        }

        const tipoWhere = buildTipoWhere()
        const porTipoResult = await prisma.$queryRaw<TableRow[]>(
          Prisma.sql`
            SELECT
              ISNULL(j.tipoSolicitudText, 'No Especificado') as [key],
              COUNT(DISTINCT g.Id) as [count],
              SUM(ISNULL(j.monto, 0)) as importe,
              SUM(CASE WHEN g.EstatusSolicitud = 5 THEN (ISNULL(j.monto, 0) / NULLIF(g.MontoSolicitado, 0)) * NULLIF(g.cantidadFactura, 0) ELSE 0 END) as facturada,
              SUM(CASE WHEN g.EstatusSolicitud = 4 THEN (ISNULL(j.monto, 0) / NULLIF(g.MontoSolicitado, 0)) * NULLIF(g.cantidadFactura, 0) ELSE 0 END) as pagada
            FROM GASOSOL_SolGastos g
            CROSS APPLY OPENJSON(g.ConceptoSolicitud)
              WITH (
                tipoSolicitud INT '$.tipoSolicitud',
                tipoSolicitudText NVARCHAR(MAX) '$.tipoSolicitudText',
                monto FLOAT '$.monto'
              ) AS j
            WHERE ${tipoWhere}
            GROUP BY ISNULL(j.tipoSolicitudText, 'No Especificado')
            ORDER BY importe DESC
          `
        )

        const buildSolicitanteWhere = () => {
          const conditions: Prisma.Sql[] = [tenantCondition]
          if (fechaInicio && fechaFin) {
            conditions.push(
              Prisma.sql`g.FechaSolicitud BETWEEN CAST(${fechaInicio} AS date) AND CAST(${fechaFin} AS date)`
            )
          } else {
            conditions.push(Prisma.sql`YEAR(g.FechaSolicitud) = ${year}`)
          }
          if (solicitanteArr.length > 0) {
            const inList = solicitanteArr.map(n => Prisma.sql`${n}`).join(', ')
            conditions.push(Prisma.sql`g.IdSolicitante IN (${inList})`)
          }
          return Prisma.join(conditions, ' AND ')
        }

        const solicitanteWhere = buildSolicitanteWhere()
        const porSolicitanteResult = await prisma.$queryRaw<TableRow[]>(
          Prisma.sql`
            SELECT
              ISNULL(LTRIM(RTRIM(ue.FirstName + ' ' + ue.LastName)), 'No Especificado') as [key],
              COUNT(DISTINCT g.Id) as [count],
              SUM(g.MontoSolicitado) as importe,
              SUM(CASE WHEN g.EstatusSolicitud = 5 THEN g.cantidadFactura ELSE 0 END) as facturada,
              SUM(CASE WHEN g.EstatusSolicitud = 4 THEN g.cantidadFactura ELSE 0 END) as pagada
            FROM GASOSOL_SolGastos g
            LEFT JOIN dbo.GASOCO_Cat_Usuarios u ON g.IdSolicitante = u.IdUsuario
            LEFT JOIN HumanCapital.Employees ue ON ue.TenantID = u.TenantID AND ue.EmployeeID = u.EmployeeID
            WHERE ${solicitanteWhere}
            GROUP BY LTRIM(RTRIM(ue.FirstName + ' ' + ue.LastName))
            ORDER BY importe DESC
          `
        )

        const buildProyectoWhere = () => {
          const conditions: Prisma.Sql[] = [tenantCondition]
          if (fechaInicio && fechaFin) {
            conditions.push(
              Prisma.sql`g.FechaSolicitud BETWEEN CAST(${fechaInicio} AS date) AND CAST(${fechaFin} AS date)`
            )
          } else {
            conditions.push(Prisma.sql`YEAR(g.FechaSolicitud) = ${year}`)
          }
          if (proyectoArr.length > 0) {
            const inList = proyectoArr.map(n => Prisma.sql`${n}`).join(', ')
            conditions.push(Prisma.sql`g.IdProyecto IN (${inList})`)
          }
          return Prisma.join(conditions, ' AND ')
        }

        const proyectoWhere = buildProyectoWhere()
        const porProyectoResult = await prisma.$queryRaw<Array<{ key: string; count: number; importe: number }>>(
          Prisma.sql`
            SELECT TOP 20
              ISNULL(p.ProyectoNombre, 'Sin proyecto') as [key],
              COUNT(DISTINCT g.Id) as [count],
              SUM(g.MontoSolicitado) as importe
            FROM GASOSOL_SolGastos g
            LEFT JOIN GASOCO_Cat_Proyectos p ON g.IdProyecto = p.Id
            WHERE ${proyectoWhere}
            GROUP BY p.ProyectoNombre
            ORDER BY importe DESC
          `
        )

        const facturadoPagadoResult = await prisma.$queryRaw<TableRow[]>(
          Prisma.sql`
            SELECT
              CASE g.EstatusSolicitud
                WHEN 1 THEN 'Aceptada'
                WHEN 2 THEN 'Rechazada'
                WHEN 4 THEN 'Pagada'
                WHEN 5 THEN 'Facturada'
                ELSE 'Pendiente'
              END as [key],
              COUNT(DISTINCT g.Id) as [count],
              SUM(g.MontoSolicitado) as importe,
              SUM(CASE WHEN g.EstatusSolicitud = 5 THEN g.cantidadFactura ELSE 0 END) as facturada,
              SUM(CASE WHEN g.EstatusSolicitud = 4 THEN g.cantidadFactura ELSE 0 END) as pagada
            FROM GASOSOL_SolGastos g
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

        const allSolicitantes = await prisma.$queryRaw<
          Array<{
            Folio: number
            NombreSolicitante: string
            MontoSolicitado: number
            cantidadFactura: number
            EstatusSolicitud: number
            ConceptoSolicitud: string
          }>
        >(
          Prisma.sql`
            SELECT g.Id as Folio, u.Nombre as NombreSolicitante, g.MontoSolicitado, g.cantidadFactura, g.EstatusSolicitud, g.ConceptoSolicitud
            FROM GASOSOL_SolGastos g
            LEFT JOIN dbo.GASOCO_Cat_Usuarios u ON g.IdSolicitante = u.IdUsuario
            WHERE ${baseWhere}
          `
        )

        const insights = computeInsights(allSolicitantes)

        const result = {
          counters: {
            total: Number(counters?.total ?? 0),
            facturada: Number(counters?.facturada ?? 0),
            pagada: Number(counters?.pagada ?? 0),
            pendiente: Number(counters?.pendiente ?? 0),
            aceptada: Number(counters?.aceptada ?? 0),
            rechazada: Number(counters?.rechazada ?? 0)
          },
          porMes: monthlyByDeptResult,
          porMesEstatus: monthlyByStatusResult,
          porDepartamento: porDepartamentoResult.map(r => ({
            key: r.key,
            count: Number(r.count),
            importe: Number(r.importe),
            facturada: Number(r.facturada),
            pagada: Number(r.pagada)
          })),
          porTipo: porTipoResult.map(r => ({
            key: r.key,
            count: Number(r.count),
            importe: Number(r.importe),
            facturada: Number(r.facturada),
            pagada: Number(r.pagada)
          })),
          porSolicitante: porSolicitanteResult.map(r => ({
            key: r.key,
            count: Number(r.count),
            importe: Number(r.importe),
            facturada: Number(r.facturada),
            pagada: Number(r.pagada)
          })),
          porProyecto: porProyectoResult.map(r => ({
            key: r.key,
            count: Number(r.count),
            importe: Number(r.importe)
          })),
          facturadoPagado: facturadoPagadoResult.map(r => ({
            key: r.key,
            count: Number(r.count),
            importe: Number(r.importe),
            facturada: Number(r.facturada),
            pagada: Number(r.pagada)
          })),
          insights
        }

        return NextResponse.json({ ok: true, data: result })
      })
    } catch (e) {
      console.error('[operating-expenses/dashboard] Error:', e)
      return NextResponse.json({ error: (e as Error).message }, { status: 500 })
    }
  },
  { bit: PERM.R }
)

function computeInsights(
  rows: Array<{
    Folio: number
    NombreSolicitante: string
    MontoSolicitado: number
    cantidadFactura: number
    EstatusSolicitud: number
    ConceptoSolicitud: string
  }>
): InsightData {
  const projectMap: Record<string, number> = {}
  const typeMap: Record<string, number> = {}
  const applicantMap: Record<string, number> = {}
  let pending = 0

  for (const row of rows) {
    const facturado = Number(row.cantidadFactura) || 0

    if (row.EstatusSolicitud === 3 || row.EstatusSolicitud === null) pending++

    let conceptos: Array<{ tipoSolicitudText?: string; monto?: number }> = []

    try {
      if (row.ConceptoSolicitud) {
        conceptos = JSON.parse(row.ConceptoSolicitud) || []
      }
    } catch (_) {}

    for (const c of conceptos) {
      const tipo = c.tipoSolicitudText || 'No Especificado'
      const monto = Number(c.monto) || 0
      typeMap[tipo] = (typeMap[tipo] || 0) + monto
    }

    const nombre = row.NombreSolicitante || 'No Especificado'
    applicantMap[nombre] = (applicantMap[nombre] || 0) + facturado
  }

  const topProject = Object.entries(projectMap).sort((a, b) => b[1] - a[1])[0] || null
  const topType = Object.entries(typeMap).sort((a, b) => b[1] - a[1])[0] || null
  const topApplicant = Object.entries(applicantMap).sort((a, b) => b[1] - a[1])[0] || null

  return {
    topProject: topProject ? { label: topProject[0], value: topProject[1] } : null,
    topType: topType ? { label: topType[0], value: topType[1] } : null,
    topApplicant: topApplicant ? { label: topApplicant[0], value: topApplicant[1] } : null,
    pending
  }
}
