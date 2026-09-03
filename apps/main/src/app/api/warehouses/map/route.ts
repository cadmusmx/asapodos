/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable padding-line-between-statements */
/* eslint-disable newline-before-return */

import { NextResponse } from 'next/server'

import { PERM, withPermission } from '@gaso/shared'

import { withTenantContext } from '@/lib/tenant-context'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export const GET = withPermission(
  'warehouses_map',
  async (req, { tenantId }) => {
    return withTenantContext(tenantId, async () => {
      const warehouses = await prisma.gASOAL_CatalogoAlmacenes.findMany({
        where: {
          Almacen: { not: '' },
          Latitud: { not: null },
          Longitud: { not: null }
        },
        select: {
          Id: true,
          Almacen: true,
          Latitud: true,
          Longitud: true,
          Direccion: true,
          Capacidad_Ocupada: true,
          Region: true,
          Ciudad: true,
          Capacidad: true,
          Estado_Almacen: true
        },
        orderBy: { Id: 'asc' }
      })

      const allStats = await prisma.gASOAL_CatalogoAlmacenes.aggregate({
        where: { Almacen: { not: '' } },
        _count: { Id: true },
        _sum: { Capacidad: true }
      })

      const operativos = await prisma.gASOAL_CatalogoAlmacenes.count({
        where: { Almacen: { not: '' }, Estado_Almacen: 'Operativo' }
      })

      const allWarehouses = await prisma.gASOAL_CatalogoAlmacenes.findMany({
        where: { Almacen: { not: '' }, AND: [{ Capacidad: { not: null } }, { Capacidad: { gt: 0 } }] },
        select: { Capacidad: true, Capacidad_Ocupada: true }
      })

      const totalOcupado = allWarehouses.reduce((sum, w) => {
        const capacidad = w.Capacidad ?? 0
        const pct = w.Capacidad_Ocupada ?? 0
        return sum + (capacidad * pct) / 100
      }, 0)

      return NextResponse.json({
        ok: true,
        data: {
          warehouses: warehouses.map(w => ({
            Id: w.Id,
            Almacen: w.Almacen,
            Latitud: w.Latitud,
            Longitud: w.Longitud,
            Direccion: w.Direccion,
            Capacidad_Ocupada: w.Capacidad_Ocupada,
            Region: w.Region,
            Ciudad: w.Ciudad,
            Capacidad: w.Capacidad,
            Estado_Almacen: w.Estado_Almacen
          })),
          statistics: {
            total: allStats._count.Id,
            operativos,
            capacidadTotal: allStats._sum.Capacidad ?? 0,
            capacidadOcupada: Math.round(totalOcupado)
          }
        }
      })
    })
  },
  { bit: PERM.R }
)
