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
          const depts = await withTenantContext(tenantId, async tx =>
            tx.$queryRaw<Array<{ id: number; nombre: string }>>`
              SELECT DepartmentID as id, Name as nombre
              FROM HumanCapital.Departments
              WHERE TenantID = CAST(${tenantId} AS uniqueidentifier)
                AND IsActive = 1
              ORDER BY Name
            `
          )
          result = depts || []
          break
        }

        case 'areas': {
          const areas = await withTenantContext(tenantId, async tx =>
            tx.$queryRaw<Array<{ id: number; nombre: string }>>`
              SELECT AreaID as id, Name as nombre
              FROM HumanCapital.Areas
              WHERE TenantID = CAST(${tenantId} AS uniqueidentifier)
                AND IsActive = 1
              ORDER BY Name
            `
          )
          result = areas || []
          break
        }

        case 'positions': {
          const puestos = await withTenantContext(tenantId, async tx =>
            tx.$queryRaw<Array<{ id: number; nombre: string }>>`
              SELECT PositionID as id, Name as nombre
              FROM HumanCapital.Positions
              WHERE TenantID = CAST(${tenantId} AS uniqueidentifier)
                AND IsActive = 1
              ORDER BY Name
            `
          )
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
          const empleados = await withTenantContext(tenantId, async tx =>
            tx.$queryRaw<Array<{ id: number; nombre: string }>>`
              SELECT u.IdUsuario as id,
                     LTRIM(RTRIM(e.FirstName + ' ' + e.LastName)) as nombre
              FROM dbo.GASOCO_Cat_Usuarios u
              INNER JOIN HumanCapital.Employees e
                ON e.TenantID = u.TenantID AND e.EmployeeID = u.EmployeeID
              WHERE u.TenantID = CAST(${tenantId} AS uniqueidentifier)
                AND e.IsActive=1
              ORDER BY e.FirstName, e.LastName
            `
          )
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
