import { NextResponse } from 'next/server'

import { Prisma } from '@prisma/client'

import { PERM, withPermission } from '@gaso/shared'

import { withTenantContext } from '@/lib/tenant-context'

export const runtime = 'nodejs'

type CountByKey = { key: string; count: number; monto?: number }
type MonthlyData = { month: string; year: string; type: string; count: number; monto: number }

export const GET = withPermission(
  'dashboard_ope_exp',
  async (req, { tenantId }) => {
    try {
      const { searchParams } = new URL(req.url)

      const fechaInicio = searchParams.get('fechaInicio')
      const fechaFin = searchParams.get('fechaFin')
      const estatus = searchParams.get('estatus')
      const proyecto = searchParams.get('proyecto')
      const region = searchParams.get('region')
      const tipoGasto = searchParams.get('tipoGasto')
      const departamento = searchParams.get('departamento')
      const solicitante = searchParams.get('solicitante')

      const currentYear = new Date().getFullYear()

      return await withTenantContext(tenantId, async (tx) => {
        const tenantCondition = Prisma.sql`g.TenantID = CAST(${tenantId} AS uniqueidentifier) AND g.TenantID <> '00000000-0000-0000-0000-000000000000'`

        const conditions: Prisma.Sql[] = [tenantCondition]

        if (fechaInicio && fechaFin) {
          conditions.push(Prisma.sql`g.FechaSolicitud BETWEEN CAST(${fechaInicio} AS date) AND CAST(${fechaFin} AS date)`)
        } else {
          conditions.push(Prisma.sql`YEAR(g.FechaSolicitud) = ${currentYear}`)
        }

        if (estatus === '5') {
          conditions.push(Prisma.sql`g.EstatusFactura = 1`)
        } else if (estatus) {
          conditions.push(Prisma.sql`g.EstatusSolicitud = ${Number(estatus)}`)
        }

        if (proyecto) conditions.push(Prisma.sql`g.IdProyecto = ${Number(proyecto)}`)
        if (region) conditions.push(Prisma.sql`g.IdRegion = ${Number(region)}`)
        if (tipoGasto) conditions.push(Prisma.sql`g.IdTipoSolicitud = ${Number(tipoGasto)}`)
        if (departamento) conditions.push(Prisma.sql`g.IdDepartamento = ${Number(departamento)}`)
        if (solicitante) conditions.push(Prisma.sql`g.IdSolicitante = ${Number(solicitante)}`)

        const whereClause = Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`

        const countersResult = await tx.$queryRaw<Array<{ total: bigint; aceptadas: bigint; pendientes: bigint; rechazadas: bigint; pagadas: bigint; montoPagadas: number }>>(
          Prisma.sql`SELECT COUNT_BIG(1) as total, SUM(CASE WHEN g.EstatusSolicitud = 1 THEN 1 ELSE 0 END) as aceptadas, SUM(CASE WHEN g.EstatusSolicitud = 3 THEN 1 ELSE 0 END) as pendientes, SUM(CASE WHEN g.EstatusSolicitud = 2 THEN 1 ELSE 0 END) as rechazadas, SUM(CASE WHEN g.EstatusSolicitud = 4 THEN 1 ELSE 0 END) as pagadas, ISNULL(SUM(CASE WHEN g.EstatusSolicitud = 4 THEN g.MontoGastado ELSE 0 END), 0) as montoPagadas FROM GASOSOL_SolGastos g ${whereClause}`
        )

        const counters = countersResult[0]

        const baseConditionsNoEstatus: Prisma.Sql[] = [tenantCondition]

        if (fechaInicio && fechaFin) {
          baseConditionsNoEstatus.push(Prisma.sql`g.FechaSolicitud BETWEEN CAST(${fechaInicio} AS date) AND CAST(${fechaFin} AS date)`)
        } else {
          baseConditionsNoEstatus.push(Prisma.sql`YEAR(g.FechaSolicitud) = ${currentYear}`)
        }

        if (proyecto) baseConditionsNoEstatus.push(Prisma.sql`g.IdProyecto = ${Number(proyecto)}`)
        if (region) baseConditionsNoEstatus.push(Prisma.sql`g.IdRegion = ${Number(region)}`)
        if (tipoGasto) baseConditionsNoEstatus.push(Prisma.sql`g.IdTipoSolicitud = ${Number(tipoGasto)}`)
        if (departamento) baseConditionsNoEstatus.push(Prisma.sql`g.IdDepartamento = ${Number(departamento)}`)
        if (solicitante) baseConditionsNoEstatus.push(Prisma.sql`g.IdSolicitante = ${Number(solicitante)}`)

        const porMes = await tx.$queryRaw<MonthlyData[]>(
          Prisma.sql`SELECT DATENAME(MONTH, g.FechaSolicitud) as month, CAST(YEAR(g.FechaSolicitud) AS VARCHAR(4)) as year, CASE g.EstatusSolicitud WHEN 1 THEN 'Aceptadas' WHEN 2 THEN 'Rechazadas' WHEN 3 THEN 'Pendientes' WHEN 4 THEN 'Pagadas' ELSE 'Otro' END as type, COUNT(*) as count, ISNULL(SUM(g.MontoGastado), 0) as monto FROM GASOSOL_SolGastos g WHERE ${Prisma.join(baseConditionsNoEstatus, ' AND ')} GROUP BY DATENAME(MONTH, g.FechaSolicitud), CAST(YEAR(g.FechaSolicitud) AS VARCHAR(4)), CASE g.EstatusSolicitud WHEN 1 THEN 'Aceptadas' WHEN 2 THEN 'Rechazadas' WHEN 3 THEN 'Pendientes' WHEN 4 THEN 'Pagadas' ELSE 'Otro' END ORDER BY year, DATENAME(MONTH, g.FechaSolicitud)`
        )

        const porDepartamento = await tx.$queryRaw<CountByKey[]>(
          Prisma.sql`SELECT ISNULL(d.NombreDepartamento, 'Sin asignar') as [key], COUNT(*) as [count], ISNULL(SUM(g.MontoGastado), 0) as monto FROM GASOSOL_SolGastos g LEFT JOIN HumanCapital.Departments d ON d.TenantID = g.TenantID AND d.DepartmentID = g.IdDepartamento WHERE ${Prisma.join(baseConditionsNoEstatus, ' AND ')} GROUP BY d.Name ORDER BY [count] DESC`
        )

        const porPersonaConditions: Prisma.Sql[] = [...baseConditionsNoEstatus]

        if (departamento) porPersonaConditions.push(Prisma.sql`g.IdDepartamento = ${Number(departamento)}`)

        const porPersona = await tx.$queryRaw<CountByKey[]>(
          Prisma.sql`
          SELECT TOP 20
            ISNULL(LTRIM(RTRIM(ue.FirstName + ' ' + ue.LastName)), 'Sin asignar') as [key],
            COUNT(*) as [count],
            ISNULL(SUM(g.MontoGastado), 0) as monto
          FROM GASOSOL_SolGastos g
          LEFT JOIN dbo.GASOCO_Cat_Usuarios u ON g.IdSolicitante = u.IdUsuario
          LEFT JOIN HumanCapital.Employees ue ON ue.TenantID = u.TenantID AND ue.EmployeeID = u.EmployeeID
          WHERE ${Prisma.join(porPersonaConditions, ' AND ')}
          GROUP BY LTRIM(RTRIM(ue.FirstName + ' ' + ue.LastName))
          ORDER BY [count] DESC`
        )

        const porTipoConditions: Prisma.Sql[] = [tenantCondition]

        if (fechaInicio && fechaFin) {
          porTipoConditions.push(Prisma.sql`g.FechaSolicitud BETWEEN CAST(${fechaInicio} AS date) AND CAST(${fechaFin} AS date)`)
        } else {
          porTipoConditions.push(Prisma.sql`YEAR(g.FechaSolicitud) = ${currentYear}`)
        }

        if (estatus) porTipoConditions.push(Prisma.sql`g.EstatusSolicitud = ${Number(estatus)}`)
        if (proyecto) porTipoConditions.push(Prisma.sql`g.IdProyecto = ${Number(proyecto)}`)
        if (region) porTipoConditions.push(Prisma.sql`g.IdRegion = ${Number(region)}`)
        if (tipoGasto) porTipoConditions.push(Prisma.sql`g.IdTipoSolicitud = ${Number(tipoGasto)}`)
        if (departamento) porTipoConditions.push(Prisma.sql`g.IdDepartamento = ${Number(departamento)}`)
        if (solicitante) porTipoConditions.push(Prisma.sql`g.IdSolicitante = ${Number(solicitante)}`)

        const porTipo = await tx.$queryRaw<CountByKey[]>(
          Prisma.sql`SELECT ISNULL(t.NombreSolicitud, 'Sin asignar') as [key], COUNT(*) as [count] FROM GASOSOL_SolGastos g LEFT JOIN GASOSOL_TipoSolGastos t ON g.IdTipoSolicitud = t.IdTipoSolicitud WHERE ${Prisma.join(porTipoConditions, ' AND ')} GROUP BY t.NombreSolicitud ORDER BY [count] DESC`
        )

        const porTipoPago = await tx.$queryRaw<CountByKey[]>(
          Prisma.sql`SELECT CASE g.TipoPago WHEN 0 THEN 'Empleado' WHEN 1 THEN 'Contratista' ELSE 'Otro' END as [key], COUNT(*) as [count], ISNULL(SUM(g.MontoGastado), 0) as monto FROM GASOSOL_SolGastos g WHERE ${Prisma.join(porTipoConditions, ' AND ')} GROUP BY CASE g.TipoPago WHEN 0 THEN 'Empleado' WHEN 1 THEN 'Contratista' ELSE 'Otro' END ORDER BY [count] DESC`
        )

        const porProyectoConditions: Prisma.Sql[] = [tenantCondition]

        if (fechaInicio && fechaFin) {
          porProyectoConditions.push(Prisma.sql`g.FechaSolicitud BETWEEN CAST(${fechaInicio} AS date) AND CAST(${fechaFin} AS date)`)
        } else {
          porProyectoConditions.push(Prisma.sql`YEAR(g.FechaSolicitud) = ${currentYear}`)
        }

        if (estatus) porProyectoConditions.push(Prisma.sql`g.EstatusSolicitud = ${Number(estatus)}`)
        if (region) porProyectoConditions.push(Prisma.sql`g.IdRegion = ${Number(region)}`)
        if (tipoGasto) porProyectoConditions.push(Prisma.sql`g.IdTipoSolicitud = ${Number(tipoGasto)}`)
        if (departamento) porProyectoConditions.push(Prisma.sql`g.IdDepartamento = ${Number(departamento)}`)
        if (solicitante) porProyectoConditions.push(Prisma.sql`g.IdSolicitante = ${Number(solicitante)}`)

        const porProyecto = await tx.$queryRaw<CountByKey[]>(
          Prisma.sql`SELECT TOP 20 ISNULL(p.ProyectoNombre, 'Sin proyecto') as [key], COUNT(*) as [count], ISNULL(SUM(g.MontoGastado), 0) as monto FROM GASOSOL_SolGastos g LEFT JOIN GASOCO_Cat_Proyectos p ON g.IdProyecto = p.Id WHERE ${Prisma.join(porProyectoConditions, ' AND ')} GROUP BY p.ProyectoNombre ORDER BY monto DESC`
        )

        const solicitadoVsGastado = await tx.$queryRaw<MonthlyData[]>(
          Prisma.sql`
          SELECT DATENAME(MONTH, g.FechaSolicitud) as month, CAST(YEAR(g.FechaSolicitud) AS VARCHAR(4)) as year, 'Solicitado' as type, COUNT(*) as count, ISNULL(SUM(g.MontoSolicitado), 0) as monto FROM GASOSOL_SolGastos g WHERE ${Prisma.join(porProyectoConditions, ' AND ')} GROUP BY DATENAME(MONTH, g.FechaSolicitud), CAST(YEAR(g.FechaSolicitud) AS VARCHAR(4))
          UNION ALL
          SELECT DATENAME(MONTH, g.FechaSolicitud) as month, CAST(YEAR(g.FechaSolicitud) AS VARCHAR(4)) as year, 'Gastado' as type, COUNT(*) as count, ISNULL(SUM(g.MontoGastado), 0) as monto FROM GASOSOL_SolGastos g WHERE ${Prisma.join(porProyectoConditions, ' AND ')} GROUP BY DATENAME(MONTH, g.FechaSolicitud), CAST(YEAR(g.FechaSolicitud) AS VARCHAR(4))
          ORDER BY year, DATENAME(MONTH, g.FechaSolicitud)
          `
        )

        return NextResponse.json({
          ok: true,
          data: {
            counters: {
              total: Number(counters?.total ?? 0),
              aceptadas: Number(counters?.aceptadas ?? 0),
              pendientes: Number(counters?.pendientes ?? 0),
              rechazadas: Number(counters?.rechazadas ?? 0),
              pagadas: Number(counters?.pagadas ?? 0),
              montoPagadas: Number(counters?.montoPagadas ?? 0)
            },
            porMes,
            porDepartamento,
            porPersona,
            porTipo,
            porTipoPago,
            porProyecto,
            solicitadoVsGastado
          }
        })
      })
    } catch (e) {
      console.error('[operating-expenses/dashboard] Error:', e)

      return NextResponse.json({ error: (e as Error).message }, { status: 500 })
    }
  },
  { bit: PERM.R }
)
