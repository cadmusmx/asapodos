import { NextResponse } from 'next/server'

import { Prisma } from '@prisma/client'

import { PERM, withPermission, withTenantContext, writeAuthAudit } from '@gaso/shared'

export const runtime = 'nodejs'

// El id va antes de /mfa/reset, no es el último segmento → se lee de context.params.
type RouteContext = { params: Promise<{ idUsuario: string }> }

/**
 * Restablecer MFA (TOTP) de una cuenta.
 * Vive bajo /api/users porque es una acción de Gestión de Usuarios y necesita el x-tenant-id que el middleware inyecta
 * (el namespace /api/admin está excluido del matcher → no recibe tenant → 401).
 * Escribe `Security.UserMfaFactors` (dominio Security): la orquesta este módulo, pero la tabla es de S1.
 * Solo cuentas activas (Estatus='A').
 */
export const POST = withPermission(
  'users',
  async (req, { auth, tenantId }, context: RouteContext) => {
    try {
      const { idUsuario } = await context.params
      const targetUserId = Number(idUsuario)

      if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
        return NextResponse.json({ ok: false, message: ['Usuario inválido.'] }, { status: 400 })
      }

      const body = await req.json().catch(() => ({}))
      const reason = String(body.reason ?? 'Admin MFA reset').trim()

      const result = await withTenantContext(tenantId, async tx => {
        const targetRows = await tx.$queryRaw<Array<{ IdUsuario: number; Usuario: string }>>(
          Prisma.sql`
            SELECT IdUsuario, Usuario
            FROM dbo.GASOCO_Cat_Usuarios
            WHERE IdUsuario = ${targetUserId}
              AND TenantID = CAST(${tenantId} AS uniqueidentifier)
              AND Estatus = 'A'
          `
        )

        const targetUser = targetRows[0]

        if (!targetUser) return null

        const updatedRows = await tx.$executeRaw(
          Prisma.sql`
            UPDATE Security.UserMfaFactors
            SET IsEnabled = 0, IsVerified = 0, DisabledAt = SYSUTCDATETIME(),
                UpdatedAt = SYSUTCDATETIME(), UpdatedBy = ${auth.email ?? String(auth.userId)}
            WHERE TenantID = CAST(${tenantId} AS uniqueidentifier)
              AND IdUsuario = ${targetUser.IdUsuario}
              AND FactorType = 'TOTP'
              AND IsEnabled = 1
          `
        )

        return { targetUser, updatedRows }
      })

      if (!result) {
        return NextResponse.json(
          { ok: false, message: ['Cuenta no encontrada para el tenant actual.'] },
          { status: 404 }
        )
      }

      await writeAuthAudit({
        eventType: 'MFA_RESET',
        eventStatus: 'SUCCESS',
        tenantId,
        username: result.targetUser.Usuario,
        userId: result.targetUser.IdUsuario,
        email: null,
        reason,
        metadata: {
          targetUserId: result.targetUser.IdUsuario,
          targetUsername: result.targetUser.Usuario,
          factorType: 'TOTP',
          performedBy: auth.email ?? String(auth.userId),
          updatedRows: result.updatedRows
        }
      })

      return NextResponse.json({ ok: true, message: ['MFA reset completed'], updatedRows: result.updatedRows })
    } catch (error) {
      console.error('[MFA_RESET_ERROR]', { message: error instanceof Error ? error.message : 'Unknown error' })

      return NextResponse.json({ ok: false, message: ['Server error while resetting MFA'] }, { status: 500 })
    }
  },
  { bit: PERM.U }
)
