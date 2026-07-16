import { NextRequest, NextResponse } from 'next/server'

import { requirePlatformRole, prisma, setTenantContext } from '@gaso/shared'
import { getAdminTenantId } from '@/services/admin-tenant'

export async function GET(req: NextRequest) {
  const guard = await requirePlatformRole('super_admin')

  if (!guard.ok) {
    return NextResponse.json({ message: guard.message }, { status: guard.status })
  }

  const { searchParams } = new URL(req.url)
  const query = searchParams.get('q') || ''

  if (query.length < 2) {
    return NextResponse.json({ users: [] })
  }

  const tenantId = await getAdminTenantId()
  await setTenantContext(tenantId)

  const searchTerm = `%${query}%`

  const users = await prisma.$queryRawUnsafe<Array<{
    UserID: number
    Usuario: string
    Nombre: string
    Email: string | null
    Estatus: string
    hasRole: number
  }>>(
    `SELECT TOP 20
      u.IdUsuario as UserID,
      u.Usuario,
      u.Nombre,
      u.Email,
      u.Estatus,
      CAST(CASE WHEN pu.UserID IS NOT NULL THEN 1 ELSE 0 END AS INT) as hasRole
    FROM dbo.GASOCO_Cat_Usuarios u
    LEFT JOIN Security.PlatformUsers pu ON pu.UserID = u.IdUsuario
    WHERE u.Estatus = 'A'
      AND (
        u.Usuario LIKE @p1
        OR u.Nombre LIKE @p1
        OR u.Email LIKE @p1
      )
    ORDER BY u.Nombre ASC`,
    searchTerm
  )

  return NextResponse.json({ users })
}
