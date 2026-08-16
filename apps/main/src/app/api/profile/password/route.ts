import { NextResponse } from 'next/server'

import { Prisma } from '@prisma/client'

import {
  resolveSession,
  getTenantFromHeaders,
  withTenantContext,
  writeTransactionLog,
  ID_ORIGIN_WEB
} from '@gaso/shared'

import { parseChangePasswordPayload } from '@/lib/profile/normalize'

export const runtime = 'nodejs'

export async function PUT(req: Request) {
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

  let payload

  try {
    const body = await req.json()

    payload = parseChangePasswordPayload(body)
  } catch (e) {
    return NextResponse.json(
      { message: e instanceof Error ? e.message : 'Payload inválido' },
      { status: 400 }
    )
  }

  try {
    await withTenantContext(tenantId, async (tx) => {
      const rows = await tx.$queryRaw<Array<{ Password: string | null }>>(
        Prisma.sql`
          SELECT Password
          FROM dbo.GASOCO_Cat_Usuarios
          WHERE IdUsuario = ${userId}
            AND TenantID = CAST(${tenantId} AS uniqueidentifier)
        `
      )

      const row = rows[0]

      if (!row) throw new Error('USER_NOT_FOUND')

      if (row.Password !== payload.currentPassword) {
        throw new Error('INVALID_CURRENT_PASSWORD')
      }

      await tx.$executeRaw(
        Prisma.sql`
          UPDATE dbo.GASOCO_Cat_Usuarios
          SET Password = ${payload.newPassword}
          WHERE IdUsuario = ${userId}
            AND TenantID = CAST(${tenantId} AS uniqueidentifier)
        `
      )
    })

    writeTransactionLog({
      tenantId,
      tableName: 'Auth.PasswordChange',
      action: 'UPDATE',
      userId,
      appUser: auth.email ?? null,
      oldData: null,
      newData: { userId },
      idOrigin: ID_ORIGIN_WEB
    }).catch(() => {})

    return NextResponse.json({ message: 'Contraseña actualizada correctamente' })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'

    if (message === 'USER_NOT_FOUND') {
      return NextResponse.json({ message: 'Usuario no encontrado' }, { status: 404 })
    }

    if (message === 'INVALID_CURRENT_PASSWORD') {
      return NextResponse.json({ message: 'La contraseña actual es incorrecta' }, { status: 400 })
    }

    console.error('[PROFILE_PASSWORD_ROUTE_ERROR]', message)

    return NextResponse.json({ message: 'Error al cambiar la contraseña' }, { status: 500 })
  }
}
