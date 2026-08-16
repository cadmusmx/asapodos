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
      const almacenes = await prisma.gASOAL_CatalogoAlmacenes.findMany({
        where: { Almacen: { not: '' }, Capacidad: { not: null, gt: 0 } },
        select: { Almacen: true, Capacidad: true, Capacidad_Ocupada: true },
        orderBy: { Almacen: 'asc' }
      })

      return NextResponse.json({
        ok: true,
        data: almacenes.map(a => ({
          Almacen: a.Almacen,
          Capacidad: a.Capacidad,
          Capacidad_Ocupada: a.Capacidad_Ocupada
        }))
      })
    })
  },
  { bit: PERM.R }
)
