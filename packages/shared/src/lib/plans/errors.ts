import type { PlanLimitReason } from '../../types/plan'

export class PlanLimitError extends Error {
  constructor(
    message: string,
    public readonly code: PlanLimitReason,
    public readonly details?: {
      metric?: string
      current?: number
      limit?: number | null
      module?: string
    }
  ) {
    super(message)
    this.name = 'PlanLimitError'
  }
}

export class PlanNotFoundError extends Error {
  constructor(planName?: string) {
    super(planName ? `Plan '${planName}' not found` : 'Plan not found')
    this.name = 'PlanNotFoundError'
  }
}

export class SubscriptionNotFoundError extends Error {
  constructor(tenantId?: string) {
    super(tenantId ? `Active subscription for tenant '${tenantId}' not found` : 'Active subscription not found')
    this.name = 'SubscriptionNotFoundError'
  }
}
