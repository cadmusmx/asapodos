// Next Imports
import { NextResponse } from 'next/server'

// Third-party Imports
import { getServerSession } from 'next-auth'

// Tools
import {
    prisma,
    writeAuthAudit,
    getTenantFromHeaders,
    setTenantContext,
    authOptions
} from '@gaso/shared'

type RouteContext = {
    params: Promise<{
        id: string
    }>
}

type SessionUser = {
    id?: number | string
    name?: string | null
    email?: string | null
    admin?: boolean
    tenantId?: string | null
    tenantSlug?: string | null
}

export async function POST(req: Request, context: RouteContext) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user) {
            return NextResponse.json(
                {
                    ok: false,
                    message: ['Unauthorized']
                },
                {
                    status: 401
                }
            )
        }

        const sessionUser = session.user as SessionUser

        if (sessionUser.admin !== true) {
            return NextResponse.json(
                {
                    ok: false,
                    message: ['Forbidden']
                },
                {
                    status: 403
                }
            )
        }

        const { id } = await context.params
        const targetUserId = Number(id)

        if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
            return NextResponse.json(
                {
                    ok: false,
                    message: ['Invalid user id']
                },
                {
                    status: 400
                }
            )
        }

        const { id: tenantId, slug: tenantSlug } = getTenantFromHeaders(req.headers)

        await setTenantContext(tenantId)

        const body = await req.json().catch(() => ({}))
        const reason = String(body.reason ?? 'Admin MFA reset').trim()

        const targetUser = await prisma.gASOCO_Cat_Usuarios.findFirst({
            select: {
                IdUsuario: true,
                Usuario: true,
                Nombre: true,
                Email: true,
                TenantID: true
            },
            where: {
                IdUsuario: targetUserId,
                TenantID: tenantId,
                Estatus: 'A'
            }
        })

        if (!targetUser) {
            return NextResponse.json(
                {
                    ok: false,
                    message: ['User not found for current tenant']
                },
                {
                    status: 404
                }
            )
        }

        const updatedRows = await prisma.$executeRaw`
      UPDATE Security.UserMfaFactors
      SET
        IsEnabled = 0,
        IsVerified = 0,
        DisabledAt = SYSUTCDATETIME(),
        UpdatedAt = SYSUTCDATETIME(),
        UpdatedBy = ${sessionUser.email ?? sessionUser.name ?? 'admin'}
      WHERE TenantID = CAST(${tenantId} AS uniqueidentifier)
        AND IdUsuario = ${targetUser.IdUsuario}
        AND FactorType = 'TOTP'
        AND IsEnabled = 1
    `

        await writeAuthAudit({
            eventType: 'MFA_RESET',
            eventStatus: 'SUCCESS',
            tenantId,
            tenantSlug,
            username: targetUser.Usuario,
            userId: targetUser.IdUsuario,
            email: targetUser.Email ?? null,
            reason,
            metadata: {
                targetUserId: targetUser.IdUsuario,
                targetUsername: targetUser.Usuario,
                targetEmail: targetUser.Email,
                factorType: 'TOTP',
                performedBy: sessionUser.email ?? sessionUser.name ?? null,
                updatedRows
            }
        })

        return NextResponse.json({
            ok: true,
            message: ['MFA reset completed'],
            updatedRows
        })
    } catch (error) {
        console.error('[MFA_RESET_ERROR]', {
            message: error instanceof Error ? error.message : 'Unknown error'
        })

        return NextResponse.json(
            {
                ok: false,
                message: ['Server error while resetting MFA']
            },
            {
                status: 500
            }
        )
    }
}
