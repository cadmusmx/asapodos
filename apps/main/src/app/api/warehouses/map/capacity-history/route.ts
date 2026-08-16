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
    const { searchParams } = new URL(req.url)
    const almacen = searchParams.get('almacen')

    if (!almacen) {
      return NextResponse.json({ error: 'Missing almacen parameter' }, { status: 400 })
    }

    return withTenantContext(tenantId, async () => {
      const oneYearAgo = new Date()
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

      const historial = await prisma.gASOAL_Historial_Capacidad.findMany({
        where: {
          Almacen: almacen,
          FechaActualizacion: { gte: oneYearAgo }
        },
        select: { FechaActualizacion: true, Capacidad_Ocupada: true },
        orderBy: { FechaActualizacion: 'asc' }
      })

      const capacidad = await prisma.gASOAL_CatalogoAlmacenes.findFirst({
        where: { Almacen: almacen },
        select: { Capacidad: true }
      })

      return NextResponse.json({
        ok: true,
        capacidadTotal: capacidad?.Capacidad ?? 100,
        data: historial.map(h => ({
          fecha_actualizacion: h.FechaActualizacion?.toISOString() ?? '',
          capacidad_ocupada: h.Capacidad_Ocupada ?? 0
        }))
      })
    })
  },
  { bit: PERM.R }
)
