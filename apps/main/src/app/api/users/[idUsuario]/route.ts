import { NextResponse } from 'next/server'

import { Prisma } from '@prisma/client'

import { PERM, withPermission, writeTransactionLog } from '@gaso/shared'

import { withTenantContext } from '@/lib/tenant-context'

export const runtime = 'nodejs'

const getIdUsuarioFromRequest = (req: Request): number | null => {
  const pathname = new URL(req.url).pathname
  const idRaw = pathname.split('/').filter(Boolean).pop()
  const id = Number(idRaw)

  return Number.isInteger(id) && id > 0 ? id : null
}

type UpdateStatusPayload = { estatus: 'A' | 'I' }

const parseStatusPayload = (body: unknown): UpdateStatusPayload => {
  if (typeof body !== 'object' || body === null) {
    throw new Error('Body inválido')
  }

  const raw = body as Record<string, unknown>
  const estatus = typeof raw.estatus === 'string' ? raw.estatus.trim().toUpperCase() : ''

  // Solo A (activar/reactivar, incluido desde 'B') o I (suspender). No manejamos baja aquí (M3).
  if (estatus !== 'A' && estatus !== 'I') {
    throw new Error("estatus debe ser 'A' (activar) o 'I' (suspender).")
  }

  return { estatus }
}

/**
 * Suspender/activar cuenta = toggle de `Users.Estatus`.
 * NO toca `Employees.IsActive` (D12): cuenta y empleo son señales independientes.
 * UPDATE sin OUTPUT (trigger-safe).
 */
export const PATCH = withPermission(
  'users',
  async (req, { auth, tenantId }) => {
    const idUsuario = getIdUsuarioFromRequest(req)

    if (!idUsuario) {
      return NextResponse.json({ message: 'Usuario inválido.' }, { status: 400 })
    }

    let payload: UpdateStatusPayload

    try {
      const body = await req.json()

      payload = parseStatusPayload(body)
    } catch (error) {
      return NextResponse.json({ message: error instanceof Error ? error.message : 'Body inválido' }, { status: 400 })
    }

    try {
      const result = await withTenantContext(tenantId, async tx => {
        const currentRows = await tx.$queryRaw<Array<{ IdUsuario: number; Usuario: string; Estatus: string }>>(
          Prisma.sql`
            SELECT u.IdUsuario, u.Usuario, u.Estatus
            FROM dbo.GASOCO_Cat_Usuarios u
            WHERE u.TenantID = CAST(${tenantId} AS uniqueidentifier)
              AND u.IdUsuario = ${idUsuario}
          `
        )

        const current = currentRows[0]

        if (!current) return null

        await tx.$executeRaw(
          Prisma.sql`
            UPDATE dbo.GASOCO_Cat_Usuarios
            SET Estatus = ${payload.estatus}
            WHERE TenantID = CAST(${tenantId} AS uniqueidentifier)
              AND IdUsuario = ${idUsuario}
          `
        )

        return { previous: current.Estatus, username: current.Usuario }
      })

      if (!result) {
        return NextResponse.json({ message: 'Cuenta no encontrada.' }, { status: 404 })
      }

      writeTransactionLog({
        tenantId,
        tableName: 'dbo.GASOCO_Cat_Usuarios',
        action: payload.estatus === 'A' ? 'ACTIVATE' : 'SUSPEND',
        userId: auth.userId,
        appUser: auth.email ?? null,
        oldData: { idUsuario, estatus: result.previous },
        newData: { idUsuario, estatus: payload.estatus }
      }).catch(() => {})

      return NextResponse.json({ data: { idUsuario, estatus: payload.estatus } })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR'

      console.error('[USERS_STATUS_ERROR]', { message })

      return NextResponse.json({ message: 'Error al cambiar el estado de la cuenta.' }, { status: 500 })
    }
  },
  { bit: PERM.U }
)
