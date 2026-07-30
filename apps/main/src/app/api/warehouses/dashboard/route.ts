/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable padding-line-between-statements */
/* eslint-disable newline-before-return */

import { NextResponse } from 'next/server'

import { PERM, withPermission } from '@gaso/shared'

import { withTenantContext } from '@/lib/tenant-context'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

type WarehouseItem = {
  id: number
  almacen: string
  region: string
  ciudad: string
  capacidad: number
  estadoAlmacen: string
  responsable: string
  coordinador: string
  capacidadOcupada: number
}

type OccupancyLevel = { level: string; count: number }

export const GET = withPermission(
  'dashboard_war',
  async (req, { tenantId }) => {
    const { searchParams } = new URL(req.url)

    const region = searchParams.get('region')
    const ciudad = searchParams.get('ciudad')
    const estado = searchParams.get('estado')
    const nivelOcupacion = searchParams.get('nivelOcupacion')

    return withTenantContext(tenantId, async () => {
      const warehouses = await prisma.gASOAL_CatalogoAlmacenes.findMany({
        where: {
          Almacen: { not: '' }
        }
      })

      let filtered: typeof warehouses = warehouses

      if (region) {
        filtered = filtered.filter((w) => w.Region === region)
      }
      if (ciudad) {
        filtered = filtered.filter((w) => w.Ciudad === ciudad)
      }
      if (estado) {
        filtered = filtered.filter((w) => w.Estado_Almacen === estado)
      }

      const totalAlmacenes = filtered.length

      const operativos = filtered.filter((w) => w.Estado_Almacen === 'Operativo').length

      const capacidadTotal = filtered.reduce((sum, w) => sum + (w.Capacidad ?? 0), 0)

      const espacioOcupado = filtered.reduce((sum, w) => sum + (w.Capacidad_Ocupada ?? 0), 0)

      const espacioDisponible = capacidadTotal - espacioOcupado

      const ocupacionPorcentaje = capacidadTotal > 0
        ? Math.round((espacioOcupado / capacidadTotal) * 100)
        : 0

      const getNivel = (porcentaje: number): string => {
        if (porcentaje >= 90) return 'CRITICO'
        if (porcentaje >= 80) return 'ALTO'
        if (porcentaje >= 65) return 'MEDIO'
        return 'NORMAL'
      }

      const warehouseItems: WarehouseItem[] = filtered.map((w: typeof warehouses[number]) => {
        const capacidad = w.Capacidad ?? 0
        const ocupada = w.Capacidad_Ocupada ?? 0
        const pct = capacidad > 0 ? Math.round((ocupada / capacidad) * 100) : 0
        return {
          id: w.Id,
          almacen: w.Almacen,
          region: w.Region,
          ciudad: w.Ciudad,
          capacidad: capacidad,
          estadoAlmacen: w.Estado_Almacen ?? '',
          responsable: w.Responsable ?? '',
          coordinador: w.Coordinador ?? '',
          capacidadOcupada: ocupada
        }
      })

      let nivelFiltered = warehouseItems
      if (nivelOcupacion) {
        nivelFiltered = warehouseItems.filter(w => {
          const pct = w.capacidad > 0 ? Math.round((w.capacidadOcupada / w.capacidad) * 100) : 0
          return getNivel(pct) === nivelOcupacion
        })
      }

      const nivelesRaw = nivelFiltered.map(w => {
        const pct = w.capacidad > 0 ? Math.round((w.capacidadOcupada / w.capacidad) * 100) : 0
        return getNivel(pct)
      })

      const nivelCounts: Record<string, number> = { NORMAL: 0, MEDIO: 0, ALTO: 0, CRITICO: 0 }
      nivelesRaw.forEach(n => { nivelCounts[n] = (nivelCounts[n] || 0) + 1 })

      const occupancyLevels: OccupancyLevel[] = [
        { level: 'NORMAL', count: nivelCounts['NORMAL'] || 0 },
        { level: 'MEDIO', count: nivelCounts['MEDIO'] || 0 },
        { level: 'ALTO', count: nivelCounts['ALTO'] || 0 },
        { level: 'CRITICO', count: nivelCounts['CRITICO'] || 0 }
      ]

      const capacidadVsOcupado = warehouseItems.map(w => ({
        almacen: w.almacen,
        capacidad: w.capacidad,
        ocupado: w.capacidadOcupada
      }))

      const estadosCount = {
        operativos: operativos,
        inoperativos: totalAlmacenes - operativos
      }

      return NextResponse.json({
        ok: true,
        data: {
          counters: {
            totalAlmacenes,
            operativos,
            capacidadTotal,
            espacioOcupado,
            espacioDisponible,
            ocupacionPorcentaje
          },
          warehouseItems,
          occupancyLevels,
          capacidadVsOcupado,
          estadosCount,
          regions: [...new Set(warehouseItems.map(w => w.region))].filter(Boolean),
          cities: [...new Set(warehouseItems.map(w => w.ciudad))].filter(Boolean)
        }
      })
    })
  },
  { bit: PERM.R }
)
