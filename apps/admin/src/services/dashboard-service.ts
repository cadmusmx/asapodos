import { prisma } from '@gaso/shared'

export interface TenantStats {
  total: number
  active: number
  suspended: number
  inactive: number
  trial: number
}

export async function getTenantStats(): Promise<TenantStats> {
  try {
    const stats = await prisma.$queryRawUnsafe<Array<{ Status: string; count: bigint }>>(
      'SELECT Status, COUNT(*) as count FROM Security.Tenants GROUP BY Status'
    )

    const result: TenantStats = { total: 0, active: 0, suspended: 0, inactive: 0, trial: 0 }

    if (Array.isArray(stats)) {
      for (const row of stats) {
        const count = typeof row.count === 'bigint' ? Number(row.count) : (Number(row.count) || 0)
        result.total += count
        if (row.Status === 'ACTIVE') result.active = count
        else if (row.Status === 'SUSPENDED') result.suspended = count
        else if (row.Status === 'INACTIVE') result.inactive = count
        else if (row.Status === 'TRIAL') result.trial = count
      }
    }

    return result
  } catch (error) {
    console.error('[getTenantStats] Error:', error)
    return { total: 0, active: 0, suspended: 0, inactive: 0, trial: 0 }
  }
}

export interface RecentTenant {
  TenantID: string
  CompanyName: string
  Status: string
  SubscriptionPlan: string | null
  CreatedAt: Date | null
}

export async function getRecentTenants(limit = 8): Promise<RecentTenant[]> {
  try {
    const tenants = await prisma.$queryRawUnsafe<RecentTenant[]>(`
      SELECT TOP(${limit}) t.TenantID, t.CompanyName, t.Status, p.Name as SubscriptionPlan, t.CreatedAt
      FROM Security.Tenants t
      LEFT JOIN Security.TenantSubscriptions s ON s.TenantId = t.TenantId AND s.Status IN ('TRIAL', 'ACTIVE')
      LEFT JOIN Security.Plans p ON p.PlanId = s.PlanId
      ORDER BY t.CreatedAt DESC
    `)
    return Array.isArray(tenants) ? tenants : []
  } catch (error) {
    console.error('[getRecentTenants] Error:', error)
    return []
  }
}
