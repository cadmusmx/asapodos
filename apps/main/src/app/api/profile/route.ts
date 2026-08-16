import { NextResponse } from 'next/server'

import { Prisma } from '@prisma/client'

import {
  resolveSession,
  getTenantFromHeaders,
  withTenantContext,
  getProfilePhoto
} from '@gaso/shared'

import type { ProfileBasicRow, ProfileEmployeeRow, ProfileOrgNamesRow } from '@/types/profile'
import { normalizeProfileFromRow } from '@/lib/profile/normalize'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  const auth = await resolveSession(req)

  if (!auth) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 })
  }

  const userId = auth.userId

  let tenantId: string

  try {
    const { id } = getTenantFromHeaders(req.headers)

    tenantId = id
  } catch {
    return NextResponse.json({ message: 'Contexto de tenant no disponible' }, { status: 401 })
  }

  if (auth.tenantId && auth.tenantId.toLowerCase() !== tenantId.toLowerCase()) {
    return NextResponse.json({ message: 'Sesión de tenant no válida' }, { status: 403 })
  }

  try {
    const result = await withTenantContext(tenantId, async (tx) => {
      const [basicRows, employeeRows, orgNameRows] = await Promise.all([
        tx.$queryRaw<ProfileBasicRow[]>(
          Prisma.sql`
            SELECT
              u.IdUsuario,
              u.TenantID,
              u.Usuario,
              e.DepartmentID AS IdDepartamento,
              e.PositionID  AS IdPuesto,
              ed.AreaID     AS IdArea,
              ed.RegionID   AS IdRegion
            FROM dbo.GASOCO_Cat_Usuarios u
            INNER JOIN HumanCapital.Employees e
              ON e.TenantID = u.TenantID AND e.EmployeeID = u.EmployeeID
            LEFT JOIN HumanCapital.EmployeeData ed
              ON ed.TenantID = e.TenantID AND ed.EmployeeID = e.EmployeeID
            WHERE u.IdUsuario = ${userId}
              AND u.TenantID = CAST(${tenantId} AS uniqueidentifier)
          `
        ),
        tx.$queryRaw<ProfileEmployeeRow[]>(
          Prisma.sql`
            SELECT
              e.EmployeeID,
              e.TenantID,
              e.EmployeeNumber,
              e.FirstName,
              e.LastName,
              e.Email,
              e.Phone,
              e.DepartmentID,
              e.PositionID,
              e.EmploymentStatus,
              e.HireDate,
              e.IsActive,
              ed.AreaID,
              ed.RegionID,
              ed.CURP,
              ed.RFC,
              ed.NSS
            FROM HumanCapital.Employees e
            INNER JOIN dbo.GASOCO_Cat_Usuarios u
              ON u.TenantID = e.TenantID AND u.EmployeeID = e.EmployeeID
            LEFT JOIN HumanCapital.EmployeeData ed
              ON ed.TenantID = e.TenantID AND ed.EmployeeID = e.EmployeeID
            WHERE u.IdUsuario = ${userId}
              AND e.TenantID = CAST(${tenantId} AS uniqueidentifier)
          `
        ),
        tx.$queryRaw<ProfileOrgNamesRow[]>(
          Prisma.sql`
            SELECT
              d.Name        AS DepartmentName,
              p.Name        AS PositionName,
              a.Name        AS AreaName,
              r.NombreReg   AS RegionName
            FROM HumanCapital.Employees e
            INNER JOIN dbo.GASOCO_Cat_Usuarios u
              ON u.TenantID = e.TenantID AND u.EmployeeID = e.EmployeeID
            LEFT JOIN HumanCapital.EmployeeData ed
              ON ed.TenantID = e.TenantID AND ed.EmployeeID = e.EmployeeID
            LEFT JOIN HumanCapital.Departments d
              ON d.TenantID = e.TenantID AND d.DepartmentID = e.DepartmentID
            LEFT JOIN HumanCapital.Positions p
              ON p.TenantID = e.TenantID AND p.PositionID = e.PositionID
            LEFT JOIN HumanCapital.Areas a
              ON a.TenantID = e.TenantID AND a.AreaID = ed.AreaID
            LEFT JOIN dbo.Cat_Regiones r
              ON r.IdReg = ed.RegionID
            WHERE u.IdUsuario = ${userId}
              AND e.TenantID = CAST(${tenantId} AS uniqueidentifier)
          `
        )
      ])

      const basic = basicRows[0]

      if (!basic) throw new Error('USER_NOT_FOUND')

      const employee = employeeRows[0] ?? null
      const orgNames = orgNameRows[0] ?? null
      const photo = employee ? await getProfilePhoto(tenantId, employee.EmployeeID) : ''

      return normalizeProfileFromRow(basic, employee, orgNames, photo)
    })

    return NextResponse.json(result)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'

    if (message === 'USER_NOT_FOUND') {
      return NextResponse.json({ message: 'Usuario no encontrado' }, { status: 404 })
    }

    console.error('[PROFILE_ROUTE_ERROR]', message)

    return NextResponse.json({ message: 'Error al cargar el perfil' }, { status: 500 })
  }
}
