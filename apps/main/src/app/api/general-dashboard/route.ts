/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable padding-line-between-statements */
/* eslint-disable newline-before-return */

import { NextResponse } from 'next/server'

import { Prisma } from '@prisma/client'

import { PERM, withPermission } from '@gaso/shared'

import { withTenantContext } from '@/lib/tenant-context'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

async function safeQuery<T>(name: string, fn: () => Promise<T[]>, fallback: T[]): Promise<T[]> {
  try {
    return await fn()
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[general-dashboard] Query error [${name}]:`, msg.slice(0, 200))
    return fallback
  }
}

export const GET = withPermission(
  'dashboard',
  async (req, { tenantId }) => {
    const { searchParams } = new URL(req.url)
    const year = searchParams.get('year') ? Number(searchParams.get('year')) : new Date().getFullYear()
    const region = searchParams.get('region')

    return withTenantContext(tenantId, async () => {
      const tc = Prisma.sql`TenantID = CAST(${tenantId} AS uniqueidentifier)`
      const regionCondition = region ? Prisma.sql`AND IdRegion = ${Number(region)}` : Prisma.sql``

      const [hcActivos, hcInactivos, hcPorDepto, movMetrics, altasBajas] = await Promise.all([
        prisma.$queryRaw<Array<{ total: bigint }>>(
          Prisma.sql`SELECT COUNT_BIG(1) as total FROM GASOCO_Cat_Usuarios WHERE ${tc} ${regionCondition} AND Estatus = 'A'`
        ),
        prisma.$queryRaw<Array<{ total: bigint }>>(
          Prisma.sql`SELECT COUNT_BIG(1) as total FROM GASOCO_Cat_Usuarios WHERE ${tc} ${regionCondition} AND Estatus = 'I'`
        ),
        prisma.$queryRaw<Array<{ key: string; count: bigint }>>(
          Prisma.sql`SELECT TOP 10 ISNULL(d.NombreDepartamento, 'Sin asignar') as [key], COUNT(*) as [count] FROM GASOCO_Cat_Usuarios u LEFT JOIN GASOCO_RH_Departamento d ON u.IdDepartamento = d.IdDepartamento WHERE ${tc} ${regionCondition} AND u.Estatus = 'A' GROUP BY d.NombreDepartamento ORDER BY [count] DESC`
        ),
        prisma.$queryRaw<Array<{ total: bigint; palets: bigint; arribos: bigint; salidas: bigint }>>(
          Prisma.sql`SELECT COUNT_BIG(1) as total, SUM(CASE WHEN tipo = 'ENTRADA' THEN 1 ELSE 0 END) as palets, SUM(CASE WHEN Estatus = 'ARRIBO' THEN 1 ELSE 0 END) as arribos, SUM(CASE WHEN Estatus = 'SALIDA' THEN 1 ELSE 0 END) as salidas FROM GASOAL_MovimientosLote WHERE YEAR(fecha) = ${year}`
        ),
        safeQuery(
          'altasBajas',
          () => prisma.$queryRaw<Array<{ month: string; year: string; type: string; count: number }>>(
            Prisma.sql`SELECT DATENAME(MONTH, u.FechaAlta) as month, CAST(YEAR(u.FechaAlta) AS VARCHAR(4)) as year, CASE WHEN u.Estatus = 'A' THEN 'Altas' ELSE 'Bajas' END as type, COUNT(*) as count FROM GASOCO_Cat_Usuarios u WHERE ${tc} ${regionCondition} AND YEAR(u.FechaAlta) = ${year} GROUP BY DATENAME(MONTH, u.FechaAlta), CAST(YEAR(u.FechaAlta) AS VARCHAR(4)), CASE WHEN u.Estatus = 'A' THEN 'Altas' ELSE 'Bajas' END ORDER BY year, DATENAME(MONTH, u.FechaAlta)`
          ),
          []
        )
      ])

      const invPorMes = await safeQuery(
        'invPorMes',
        () => prisma.$queryRaw<Array<{ mes: string; arribos: number; salidas: number; sitiosAtt: number; sitiosTelcel: number }>>(
          Prisma.sql`SELECT DATENAME(MONTH, fecha) as mes, SUM(CASE WHEN Estatus = 'ARRIBO' THEN 1 ELSE 0 END) as arribos, SUM(CASE WHEN Estatus = 'SALIDA' THEN 1 ELSE 0 END) as salidas, 0 as sitiosAtt, 0 as sitiosTelcel FROM GASOAL_MovimientosLote WHERE YEAR(fecha) = ${year} GROUP BY DATENAME(MONTH, fecha) ORDER BY DATENAME(MONTH, fecha)`
        ),
        []
      )

      const solCounters = await prisma.$queryRaw<Array<{ total: bigint; aceptadas: bigint; pendientes: bigint; rechazadas: bigint; pagadas: bigint; montoPagadas: number }>>(
        Prisma.sql`SELECT COUNT_BIG(1) as total, SUM(CASE WHEN EstatusSolicitud = 1 THEN 1 ELSE 0 END) as aceptadas, SUM(CASE WHEN EstatusSolicitud = 3 THEN 1 ELSE 0 END) as pendientes, SUM(CASE WHEN EstatusSolicitud = 2 THEN 1 ELSE 0 END) as rechazadas, SUM(CASE WHEN EstatusSolicitud = 4 THEN 1 ELSE 0 END) as pagadas, ISNULL(SUM(CASE WHEN EstatusSolicitud = 4 THEN MontoGastado ELSE 0 END), 0) as montoPagadas FROM GASOSOL_SolGastos WHERE ${tc} AND YEAR(FechaSolicitud) = ${year}`
      )

      const gasPorMes = await safeQuery(
        'gasPorMes',
        () => prisma.$queryRaw<Array<{ mes: string; year: string; aceptadas: number; rechazadas: number; pagadas: number }>>(
          Prisma.sql`SELECT DATENAME(MONTH, FechaSolicitud) as mes, CAST(YEAR(FechaSolicitud) AS VARCHAR(4)) as year, SUM(CASE WHEN EstatusSolicitud = 1 THEN 1 ELSE 0 END) as aceptadas, SUM(CASE WHEN EstatusSolicitud = 2 THEN 1 ELSE 0 END) as rechazadas, SUM(CASE WHEN EstatusSolicitud = 4 THEN 1 ELSE 0 END) as pagadas FROM GASOSOL_SolGastos WHERE ${tc} AND YEAR(FechaSolicitud) = ${year} GROUP BY DATENAME(MONTH, FechaSolicitud), CAST(YEAR(FechaSolicitud) AS VARCHAR(4)) ORDER BY year, DATENAME(MONTH, FechaSolicitud)`
        ),
        []
      )

      const gasPorProyecto = await safeQuery(
        'gasPorProyecto',
        () => prisma.$queryRaw<Array<{ key: string; count: number; monto: number }>>(
          Prisma.sql`SELECT TOP 10 ISNULL(p.ProyectoNombre, 'Sin proyecto') as [key], COUNT(*) as [count], ISNULL(SUM(g.MontoGastado), 0) as monto FROM GASOSOL_SolGastos g LEFT JOIN GASOCO_Cat_Proyectos p ON g.IdProyecto = p.Id WHERE g.TenantID = CAST(${tenantId} AS uniqueidentifier) AND YEAR(g.FechaSolicitud) = ${year} GROUP BY p.ProyectoNombre ORDER BY monto DESC`
        ),
        []
      )

      const cotizCounters = await safeQuery(
        'cotizCounters',
        () => prisma.$queryRaw<Array<{ total: bigint; aceptadas: bigint; pendientes: bigint; rechazadas: bigint }>>(
          Prisma.sql`SELECT COUNT_BIG(1) as total, SUM(CASE WHEN CotizacionEstatus = 1 THEN 1 ELSE 0 END) as aceptadas, SUM(CASE WHEN CotizacionEstatus = 0 THEN 1 ELSE 0 END) as pendientes, SUM(CASE WHEN CotizacionEstatus = 2 THEN 1 ELSE 0 END) as rechazadas FROM GASOCO_Cat_Cotizaciones WHERE ${tc}`
        ),
        [{ total: 0n, aceptadas: 0n, pendientes: 0n, rechazadas: 0n }]
      )

      const projCounters = await safeQuery(
        'projCounters',
        () => prisma.$queryRaw<Array<{ total: bigint; activos: bigint; inactivos: bigint }>>(
          Prisma.sql`SELECT COUNT_BIG(1) as total, SUM(CASE WHEN ProyectoEstatus = 1 THEN 1 ELSE 0 END) as activos, SUM(CASE WHEN ProyectoEstatus = 0 THEN 1 ELSE 0 END) as inactivos FROM GASOCO_Cat_Proyectos WHERE ${tc}`
        ),
        [{ total: 0n, activos: 0n, inactivos: 0n }]
      )

      const projPorResponsable = await safeQuery(
        'projPorResponsable',
        () => prisma.$queryRaw<Array<{ key: string; count: bigint }>>(
          Prisma.sql`SELECT TOP 10 ISNULL(ProyectoResponsableGaso, 'Sin asignar') as [key], COUNT(*) as [count] FROM GASOCO_Cat_Proyectos WHERE ${tc} GROUP BY ProyectoResponsableGaso ORDER BY [count] DESC`
        ),
        []
      )

      const projPorMes = await safeQuery(
        'projPorMes',
        () => prisma.$queryRaw<Array<{ mes: string; year: string; status: string; count: number }>>(
          Prisma.sql`SELECT DATENAME(MONTH, ProyectoFechaCreacion) as mes, CAST(YEAR(ProyectoFechaCreacion) AS VARCHAR(4)) as year, CASE WHEN ProyectoEstatus = 1 THEN 'Activos' ELSE 'Cerrados' END as status, COUNT(*) as count FROM GASOCO_Cat_Proyectos WHERE ${tc} AND YEAR(ProyectoFechaCreacion) = ${year} GROUP BY DATENAME(MONTH, ProyectoFechaCreacion), CAST(YEAR(ProyectoFechaCreacion) AS VARCHAR(4)), CASE WHEN ProyectoEstatus = 1 THEN 'Activos' ELSE 'Cerrados' END ORDER BY year, DATENAME(MONTH, ProyectoFechaCreacion)`
        ),
        []
      )

      const almacenes = await safeQuery(
        'almacenes',
        () => prisma.$queryRaw<Array<{ total: bigint; capacidad: number; ocupada: number }>>(
          Prisma.sql`SELECT COUNT_BIG(1) as total, ISNULL(SUM(Capacidad), 0) as capacidad, ISNULL(SUM(Capacidad_Ocupada), 0) as ocupada FROM GASOAL_CatalogoAlmacenes`
        ),
        [{ total: 0n, capacidad: 0, ocupada: 0 }]
      )

      const almacenesCapacidad = await safeQuery(
        'almacenesCapacidad',
        () => prisma.$queryRaw<Array<{ almacen: string; capacidad: number; ocupado: number }>>(
          Prisma.sql`SELECT ISNULL(Almacen, 'Sin nombre') as almacen, ISNULL(Capacidad, 0) as capacidad, ISNULL(Capacidad_Ocupada, 0) as ocupado FROM GASOAL_CatalogoAlmacenes ORDER BY Capacidad DESC`
        ),
        []
      )

      return NextResponse.json({
        ok: true,
        data: {
          humanCapital: {
            activos: Number(hcActivos[0]?.total ?? 0),
            inactivos: Number(hcInactivos[0]?.total ?? 0),
            porDepto: hcPorDepto.map(d => ({ key: d.key, count: Number(d.count) })),
            altasBajas: altasBajas.map(a => ({ month: a.month, year: a.year, type: a.type, count: a.count }))
          },
          inventario: {
            total: Number(movMetrics[0]?.total ?? 0),
            palets: Number(movMetrics[0]?.palets ?? 0),
            arribos: Number(movMetrics[0]?.arribos ?? 0),
            salidas: Number(movMetrics[0]?.salidas ?? 0),
            porMes: invPorMes.map(i => ({
              mes: i.mes,
              arribos: Number(i.arribos),
              salidas: Number(i.salidas),
              sitiosAtt: 0,
              sitiosTelcel: 0
            }))
          },
          gastos: {
            total: Number(solCounters[0]?.total ?? 0),
            aceptadas: Number(solCounters[0]?.aceptadas ?? 0),
            pendientes: Number(solCounters[0]?.pendientes ?? 0),
            rechazadas: Number(solCounters[0]?.rechazadas ?? 0),
            pagadas: Number(solCounters[0]?.pagadas ?? 0),
            montoPagadas: Number(solCounters[0]?.montoPagadas ?? 0)
          },
          gastosPorMes: gasPorMes.map(g => ({
            mes: g.mes,
            year: g.year,
            aceptadas: g.aceptadas,
            rechazadas: g.rechazadas,
            pagadas: g.pagadas
          })),
          gastosPorProyecto: gasPorProyecto.map(g => ({
            key: g.key,
            count: g.count,
            monto: Number(g.monto)
          })),
          cotizaciones: {
            total: Number(cotizCounters[0]?.total ?? 0),
            aceptadas: Number(cotizCounters[0]?.aceptadas ?? 0),
            pendientes: Number(cotizCounters[0]?.pendientes ?? 0),
            rechazadas: Number(cotizCounters[0]?.rechazadas ?? 0)
          },
          proyectos: {
            total: Number(projCounters[0]?.total ?? 0),
            activos: Number(projCounters[0]?.activos ?? 0),
            inactivos: Number(projCounters[0]?.inactivos ?? 0),
            porResponsable: projPorResponsable.map(p => ({ key: p.key, count: Number(p.count) })),
            porMes: projPorMes.map(p => ({
              mes: p.mes,
              year: p.year,
              status: p.status,
              count: p.count
            }))
          },
          almacenes: {
            total: Number(almacenes[0]?.total ?? 0),
            capacidad: Number(almacenes[0]?.capacidad ?? 0),
            ocupada: Number(almacenes[0]?.ocupada ?? 0),
            capacidadPorAlmacen: almacenesCapacidad.map(a => ({
              almacen: a.almacen,
              capacidad: Number(a.capacidad),
              ocupado: Number(a.ocupado)
            }))
          },
          flotillas: {
            total: 0,
            aceptadas: 0,
            pendientes: 0,
            rechazadas: 0,
            porMes: []
          }
        }
      })
    })
  },
  { bit: PERM.R }
)
