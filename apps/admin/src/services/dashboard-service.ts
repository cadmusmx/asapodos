import { prisma } from '@gaso/shared'
import type { AuditEntryWithTenantName } from './audit-service'

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

export async function getRecentActivity(limit = 10): Promise<AuditEntryWithTenantName[]> {
  try {
    const query = `SELECT TOP(${limit}) l.AuditID, l.TenantID, l.UserID, l.TableName, l.Action, l.OldData, l.NewData, l.ChangedAt, l.AppUser, l.IdOrigin, t.CompanyName AS TenantName FROM Audit.TransactionLog l LEFT JOIN Security.Tenants t ON l.TenantID = t.TenantID WHERE t.TenantID IS NOT NULL ORDER BY l.ChangedAt DESC`
    const entries = await prisma.$queryRawUnsafe<AuditEntryWithTenantName[]>(query)

    return Array.isArray(entries) ? entries : []
  } catch (error) {
    console.error('[getRecentActivity] Error:', error)
    return []
  }
}
