/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable padding-line-between-statements */
/* eslint-disable newline-before-return */

import { NextResponse } from 'next/server'

import { Prisma } from '@prisma/client'

import { PERM, withPermission } from '@gaso/shared'

import { withTenantContext } from '@/lib/tenant-context'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

type CatalogType = 'regions' | 'departments' | 'areas' | 'positions' | 'projects' | 'clients' | 'employees' | 'vehicleTypes' | 'warehouses' | 'expenseTypes'

export const GET = withPermission(
  'dashboard_hum_cap',
  async (req, { tenantId }) => {
    try {
      const { searchParams } = new URL(req.url)
      const type = searchParams.get('type') as CatalogType

      if (!type) {
        return NextResponse.json({ error: 'Missing type parameter' }, { status: 400 })
      }

      let result: Array<{ id: number; nombre: string }> = []

      switch (type) {
        case 'regions': {
          const regions = await prisma.$queryRaw<Array<{ id: number; nombre: string }>>`
            SELECT IdReg as id, ISNULL(NombreReg, 'Sin nombre') as nombre
            FROM Cat_Regiones
            ORDER BY NombreReg
          `
          result = regions || []
          break
        }

        case 'departments': {
          const depts = await prisma.$queryRaw<Array<{ id: number; nombre: string }>>`
            SELECT IdDepartamento as id, NombreDepartamento as nombre
            FROM GASOCO_RH_Departamento
            ORDER BY NombreDepartamento
          `
          result = depts || []
          break
        }

        case 'areas': {
          const areas = await prisma.$queryRaw<Array<{ id: number; nombre: string }>>`
            SELECT IdArea as id, NombreArea as nombre
            FROM GASOCO_RH_Area
            ORDER BY NombreArea
          `
          result = areas || []
          break
        }

        case 'positions': {
          const puestos = await prisma.$queryRaw<Array<{ id: number; nombre: string }>>`
            SELECT IdPuesto as id, NombrePuesto as nombre
            FROM GASOCO_RH_Puesto
            ORDER BY NombrePuesto
          `
          result = puestos || []
          break
        }

        case 'projects': {
          const proyectos = await prisma.$queryRaw<Array<{ id: number; nombre: string }>>`
            SELECT Id as id, ISNULL(ProyectoNombre, 'Sin nombre') as nombre
            FROM GASOCO_Cat_Proyectos
            WHERE TenantID = CAST(${tenantId} AS uniqueidentifier)
            ORDER BY ProyectoNombre
          `
          result = proyectos || []
          break
        }

        case 'clients': {
          console.log('[catalogs] Fetching clients, tenantId:', tenantId)
          const clientes = await prisma.$queryRaw<Array<{ id: number; nombre: string }>>`
            SELECT IdCliente as id, ISNULL(ClienteNombre, 'Sin nombre') as nombre
            FROM GASOCO_Cat_Clientes
            ORDER BY ClienteNombre
          `
          console.log('[catalogs] Clients result:', clientes)
          result = clientes || []
          break
        }

        case 'employees': {
          const empleados = await prisma.$queryRaw<Array<{ id: number; nombre: string }>>`
            SELECT IdUsuario as id, ISNULL(Nombre, '') as nombre
            FROM GASOCO_Cat_Usuarios
            WHERE TenantID = CAST(${tenantId} AS uniqueidentifier)
            AND Estatus = 'A'
            ORDER BY Nombre
          `
          result = empleados || []
          break
        }

        case 'vehicleTypes': {
          const tipos = await prisma.$queryRaw<Array<{ id: number; nombre: string }>>`
            SELECT Id as id, Text as nombre
            FROM Cat_RVTipoVehiculo
            ORDER BY Text
          `
          result = tipos || []
          break
        }

        case 'warehouses': {
          const almacenes = await prisma.$queryRaw<Array<{ id: number; nombre: string }>>`
            SELECT Id as id, Almacen as nombre
            FROM GASOAL_CatalogoAlmacenes
            WHERE Almacen != ''
            ORDER BY Almacen
          `
          result = almacenes || []
          break
        }

        case 'expenseTypes': {
          const tipos = await prisma.$queryRaw<Array<{ id: number; nombre: string }>>`
            SELECT IdTipoSolicitud as id, NombreSolicitud as nombre
            FROM GASOSOL_TipoSolGastos
            ORDER BY NombreSolicitud
          `
          result = tipos || []
          break
        }

        default:
          return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 })
      }

      return NextResponse.json({ data: result })
    } catch (error) {
      console.error('[catalogs] Error:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }
)
