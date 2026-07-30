/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable padding-line-between-statements */
/* eslint-disable newline-before-return */

import { NextResponse } from 'next/server'

import { Prisma } from '@prisma/client'

import { PERM, withPermission } from '@gaso/shared'

import { withTenantContext } from '@/lib/tenant-context'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

type ProjectItem = {
  id: number
  nombre: string
  cliente: string
  presupuesto: number
  gasto: number
  margen: number | null
  responsable: string
  estatus: number
  porcentaje?: number
  estado?: 'onBudget' | 'exceeding' | 'exceeded'
}

type TopEmployee = { key: string; count: number }

export const GET = withPermission(
  'dashboard_pro',
  async (req, { tenantId }) => {
    try {
      const { searchParams } = new URL(req.url)

      const cliente = searchParams.get('cliente')
      const estatus = searchParams.get('estatus')
      const region = searchParams.get('region')
      const departamento = searchParams.get('departamento')
      const responsable = searchParams.get('responsable')
      const fechaInicio = searchParams.get('fechaInicio')
      const fechaFin = searchParams.get('fechaFin')

      return await withTenantContext(tenantId, async () => {
        const tenantCondition = Prisma.sql`p.TenantID = CAST(${tenantId} AS uniqueidentifier) AND p.TenantID <> '00000000-0000-0000-0000-000000000000'`

        const conditions: Prisma.Sql[] = [tenantCondition]

        if (fechaInicio && fechaFin) {
          conditions.push(Prisma.sql`p.ProyectoFechaCreacion BETWEEN CAST(${fechaInicio} AS date) AND CAST(${fechaFin} AS date)`)
        }
        if (cliente) conditions.push(Prisma.sql`p.ClienteId = ${Number(cliente)}`)
        if (estatus) conditions.push(Prisma.sql`p.ProyectoEstatus = ${Number(estatus)}`)
        if (region) conditions.push(Prisma.sql`p.IdRegion = ${Number(region)}`)
        if (departamento) conditions.push(Prisma.sql`p.ProyectoDepartamento = ${departamento}`)
        if (responsable) conditions.push(Prisma.sql`p.ProyectoResponsableIdGaso = ${Number(responsable)}`)

        const whereClause = Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`

        const countersResult = await prisma.$queryRaw<Array<{ total: bigint; activos: bigint; inactivos: bigint }>>(
          Prisma.sql`SELECT COUNT_BIG(1) as total, SUM(CASE WHEN p.ProyectoEstatus = 1 THEN 1 ELSE 0 END) as activos, SUM(CASE WHEN p.ProyectoEstatus = 0 THEN 1 ELSE 0 END) as inactivos FROM GASOCO_Cat_Proyectos p ${whereClause}`
        )
        const counters = countersResult[0]

        const proyectosResult = await prisma.$queryRaw<Array<{ id: number; nombre: string; cliente: string; presupuesto: number; gasto: number; margen: number | null; responsable: string; estatus: number }>>(
          Prisma.sql`SELECT TOP 20 p.Id as id, p.ProyectoNombre as nombre, p.ClienteNombre as cliente, ISNULL(p.ProyectoPresupuesto, 0) as presupuesto, ISNULL((SELECT SUM(s.MontoGastado) FROM GASOSOL_SolGastos s WHERE s.IdProyecto = p.Id AND s.TenantID = CAST(${tenantId} AS uniqueidentifier)), 0) as gasto, p.ProyectoMargenPorcentual as margen, p.ProyectoResponsableGaso as responsable, p.ProyectoEstatus as estatus FROM GASOCO_Cat_Proyectos p ${whereClause} ORDER BY gasto DESC`
        )

        const topEmpleadosConditions: Prisma.Sql[] = [tenantCondition, Prisma.sql`p.ProyectoResponsableGaso IS NOT NULL`]
        if (estatus) topEmpleadosConditions.push(Prisma.sql`p.ProyectoEstatus = ${Number(estatus)}`)
        if (region) topEmpleadosConditions.push(Prisma.sql`p.IdRegion = ${Number(region)}`)
        if (departamento) topEmpleadosConditions.push(Prisma.sql`p.ProyectoDepartamento = ${departamento}`)

        const topEmpleados = await prisma.$queryRaw<TopEmployee[]>(
          Prisma.sql`SELECT TOP 10 p.ProyectoResponsableGaso as [key], COUNT(*) as [count] FROM GASOCO_Cat_Proyectos p WHERE ${Prisma.join(topEmpleadosConditions, ' AND ')} GROUP BY p.ProyectoResponsableGaso ORDER BY [count] DESC`
        )

        const proyectos: ProjectItem[] = proyectosResult.map(p => ({
          id: Number(p.id),
          nombre: p.nombre || 'Sin nombre',
          cliente: p.cliente || '',
          presupuesto: Number(p.presupuesto),
          gasto: Number(p.gasto),
          margen: p.margen !== null ? Number(p.margen) : null,
          responsable: p.responsable || '',
          estatus: Number(p.estatus)
        }))

        const proyectosPorcentaje = proyectos.map(p => {
          const porcentaje = p.presupuesto > 0 ? (p.gasto / p.presupuesto) * 100 : 0
          let estado: 'onBudget' | 'exceeding' | 'exceeded'
          if (porcentaje <= 85) estado = 'onBudget'
          else if (porcentaje <= 100) estado = 'exceeding'
          else estado = 'exceeded'
          return { ...p, porcentaje, estado }
        })

        return NextResponse.json({
          ok: true,
          data: {
            counters: {
              total: Number(counters?.total ?? 0),
              activos: Number(counters?.activos ?? 0),
              inactivos: Number(counters?.inactivos ?? 0)
            },
            proyectos,
            proyectosPorcentaje,
            topEmpleados
          }
        })
      })
    } catch (e) {
      console.error('[projects/dashboard] Error:', e)
      return NextResponse.json({ error: (e as Error).message }, { status: 500 })
    }
  },
  { bit: PERM.R }
)
