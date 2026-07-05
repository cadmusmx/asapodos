import { NextResponse } from 'next/server'

import {
  writeTransactionLog,
  ID_ORIGIN_WEB,
  withTenantContext
} from '@gaso/shared'

export const runtime = 'nodejs' // Prisma no corre en edge

type AccessDeniedKind = 'NO_SESSION' | 'CROSS_TENANT'

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const kind = body.kind as AccessDeniedKind
    const tenantId = String(body.tenantId ?? '') // CROSS_TENANT: actor; NO_SESSION: tenant resuelto
    const attemptedTenantId = body.attemptedTenantId ?? null // CROSS_TENANT: a dónde intentó entrar
    const path = String(body.path ?? '')
    const tokenTenantId = body.tokenTenantId ?? null
    const userId = typeof body.userId === 'number' ? body.userId : null
    const idOrigin = typeof body.idOrigin === 'number' ? body.idOrigin : ID_ORIGIN_WEB

    if (!tenantId) {
      return NextResponse.json({ ok: false }, { status: 400 })
    }

    /*
      auditoría de seguridad depende de contexto RLS válido;
      para garantizar persistencia de todo evento (incluso sin tenant resoluble)
      se requiere camino de escritura con bypass RLS — evaluar opción C/tabla dedicada
    */

    await withTenantContext(tenantId, async () => {
      await writeTransactionLog({
        tenantId,
        tableName: 'Auth.AccessDenied',
        action: kind === 'CROSS_TENANT' ? 'XTENANT' : 'NO_SESS',
        userId,
        idOrigin,
        newData: {
          kind,
          path,
          actorTenantId: tenantId, // el tenant del usuario (dueño de la fila)
          attemptedTenantId, // a dónde intentó entrar — la evidencia
          tokenTenantId,
          ip: body.ip ?? null,
          deniedAt: new Date().toISOString()
        }
      })
    }) // tenantId = actor en cross-tenant → RLS lo permite

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error(`[TRANSACTION_LOG_INSERT_ERROR]:`, e instanceof Error ? { message: e.message, stack: e.stack } : e)

    return NextResponse.json({ ok: false }, { status: 200 })
  }
}
