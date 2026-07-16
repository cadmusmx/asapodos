import { NextResponse } from 'next/server'

import { PlanLimitError, PlanNotFoundError, SubscriptionNotFoundError } from './errors'
import { checkUserLimit, checkBranchLimit, checkStorageLimit } from './plan-limiter'
import { getTenantFromHeaders } from '../tenant-context'
import { resolveSession } from '../auth/resolve-session'
import type { UsageMetricKey } from '../../types/plan'

type GuardedHandler<C> = (req: Request, routeCtx: C) => Promise<Response> | Response

function metricToChecker(metric: UsageMetricKey) {
  switch (metric) {
    case 'users':
      return checkUserLimit
    case 'branches':
      return checkBranchLimit
    case 'storage_mb':
      return checkStorageLimit
    default:
      return checkUserLimit
  }
}

export function withPlanEnforcement<C = unknown>(
  metric: UsageMetricKey,
  handler: GuardedHandler<C>,
  options?: { bit?: number; additionalBytes?: number }
) {
  return async (req: Request, routeCtx: C): Promise<Response> => {
    try {
      const auth = await resolveSession(req)
      if (!auth) {
        return NextResponse.json({ message: 'No autenticado' }, { status: 401 })
      }

      let tenantId: string
      try {
        tenantId = getTenantFromHeaders(req.headers).id
      } catch {
        return NextResponse.json({ message: 'Contexto de tenant no disponible' }, { status: 401 })
      }

      const checker = metricToChecker(metric)
      const result = await checker(tenantId)

      if (!result.allowed) {
        const message =
          result.reason === 'USER_LIMIT_EXCEEDED'
            ? `Límite de usuarios alcanzado (${result.current}/${result.limit})`
            : result.reason === 'BRANCH_LIMIT_EXCEEDED'
            ? `Límite de sucursales alcanzado (${result.current}/${result.limit})`
            : result.reason === 'STORAGE_LIMIT_EXCEEDED'
            ? `Límite de almacenamiento alcanzado (${result.current}/${result.limit} MB)`
            : result.reason === 'PLAN_NOT_FOUND'
            ? 'No se encontró un plan activo para este tenant'
            : 'Límite del plan alcanzado'

        return NextResponse.json(
          {
            message,
            code: result.reason,
            current: result.current,
            limit: result.limit,
          },
          { status: 403 }
        )
      }

      return await handler(req, routeCtx)
    } catch (e) {
      if (e instanceof PlanLimitError) {
        return NextResponse.json(
          { message: e.message, code: e.code, details: e.details },
          { status: 403 }
        )
      }

      if (e instanceof PlanNotFoundError || e instanceof SubscriptionNotFoundError) {
        return NextResponse.json({ message: e.message }, { status: 403 })
      }

      throw e
    }
  }
}
