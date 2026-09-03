import { NextResponse } from 'next/server'

import { writeAuthAudit, withPermission, PERM, withTenantContext } from '@gaso/shared'

type RouteContext = { params: Promise<{ id: string }> }

// Columna isAdmin quedo fuera, usamos withPermission (podemos cambiar la viewCode)
export const POST = withPermission(
  'permissions_access',
  async (req, { auth, tenantId }, context: RouteContext) => {
    try {
      const { id } = await context.params
      const targetUserId = Number(id)

      if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
        return NextResponse.json({ ok: false, message: ['Invalid user id'] }, { status: 400 })
      }

      const body = await req.json().catch(() => ({}))
      const reason = String(body.reason ?? 'Admin MFA reset').trim()

      const result = await withTenantContext(tenantId, async tx => {
        const targetRows = await tx.$queryRaw<Array<{ IdUsuario: number; Usuario: string }>>`
          SELECT IdUsuario, Usuario
          FROM dbo.GASOCO_Cat_Usuarios
          WHERE IdUsuario = ${targetUserId} AND TenantID = CAST(${tenantId} AS uniqueidentifier) AND Estatus = 'A'
        `

        const targetUser = targetRows[0]

        if (!targetUser) return null

        const updatedRows = await tx.$executeRaw`
          UPDATE Security.UserMfaFactors
          SET IsEnabled = 0, IsVerified = 0, DisabledAt = SYSUTCDATETIME(),
              UpdatedAt = SYSUTCDATETIME(), UpdatedBy = ${auth.email ?? String(auth.userId)}
          WHERE TenantID = CAST(${tenantId} AS uniqueidentifier)
            AND IdUsuario = ${targetUser.IdUsuario} AND FactorType = 'TOTP' AND IsEnabled = 1
        `

        return { targetUser, updatedRows }
      })

      if (!result) {
        return NextResponse.json({ ok: false, message: ['User not found for current tenant'] }, { status: 404 })
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
  { bit: PERM.W }
)
