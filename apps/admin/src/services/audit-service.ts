import { prisma } from '@gaso/shared'
import type { TransactionLogEntry } from '@gaso/shared'

export interface AuditLogFilters {
  tenantId?: string | null
  userId?: number | null
  tableName?: string | null
  action?: string | null
  startDate?: Date | null
  endDate?: Date | null
  appUser?: string | null
}

export interface AuditLogResult {
  entries: AuditEntryWithTenantName[]
  total: number
}

export interface AuditEntryWithTenantName extends TransactionLogEntry {
  tenantName?: string
  auditId?: number
}

interface GetAuditLogOptions {
  page: number
  pageSize: number
  filters: AuditLogFilters
}

export async function getAuditLog({
  page: rawPage,
  pageSize: rawPageSize,
  filters = {}
}: GetAuditLogOptions): Promise<AuditLogResult> {
  const page = Math.max(1, Number(rawPage) || 1)
  const pageSize = Math.max(1, Number(rawPageSize) || 50)
  const offset = (page - 1) * pageSize

  const conditions: string[] = []
  const params: (string | number | Date)[] = []
  let paramIndex = 1

  if (filters.tenantId) {
    params.push(filters.tenantId)
    conditions.push(`l.TenantID = CAST(@p${paramIndex++} AS uniqueidentifier)`)
  }

  if (filters.userId) {
    params.push(filters.userId)
    conditions.push(`l.UserID = @p${paramIndex++}`)
  }

  if (filters.tableName) {
    params.push(filters.tableName)
    conditions.push(`l.TableName = @p${paramIndex++}`)
  }

  if (filters.action) {
    params.push(filters.action)
    conditions.push(`l.Action = @p${paramIndex++}`)
  }

  if (filters.startDate) {
    params.push(filters.startDate)
    conditions.push(`l.ChangedAt >= @p${paramIndex++}`)
  }

  if (filters.endDate) {
    params.push(filters.endDate)
    conditions.push(`l.ChangedAt <= @p${paramIndex++}`)
  }

  if (filters.appUser) {
    params.push(`%${filters.appUser}%`)
    conditions.push(`l.AppUser LIKE @p${paramIndex++}`)
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  const countQuery = `
    SELECT COUNT(*) as total
    FROM Audit.TransactionLog l
    ${whereClause}
  `

  const dataQuery = `
    SELECT
      l.AuditID,
      l.TenantID AS tenantId,
      l.UserID AS userId,
      l.TableName AS tableName,
      l.Action AS action,
      l.OldData AS oldData,
      l.NewData AS newData,
      l.ChangedAt AS changedAt,
      l.AppUser AS appUser,
      l.IdOrigin AS idOrigin,
      t.CompanyName AS tenantName
    FROM Audit.TransactionLog l
    LEFT JOIN Security.Tenants t ON l.TenantID = t.TenantID
    ${whereClause ? `${whereClause} AND ` : 'WHERE '}(1=1)
    ORDER BY l.ChangedAt DESC
    OFFSET @p${params.length + 1} ROWS FETCH NEXT @p${params.length + 2} ROWS ONLY
  `

  const dataParams = [...params, offset, pageSize]

  const [entries, totalResult] = await Promise.all([
    prisma.$queryRawUnsafe<AuditEntryWithTenantName[]>(dataQuery, ...dataParams),
    prisma.$queryRawUnsafe<Array<{ total: number }>>(countQuery, ...params)
  ])

  return {
    entries,
    total: Number(totalResult[0]?.total) || 0
  }
}

interface GetTenantAuditLogOptions {
  page: number
  pageSize: number
  tenantId: string
}

export async function getTenantAuditLog({
  page: rawPage,
  pageSize: rawPageSize,
  tenantId
}: GetTenantAuditLogOptions): Promise<AuditLogResult> {
  const page = Math.max(1, Number(rawPage) || 1)
  const pageSize = Math.max(1, Number(rawPageSize) || 50)
  return getAuditLog({
    page,
    pageSize,
    filters: { tenantId }
  })
}

interface GetGlobalAuditLogOptions {
  page: number
  pageSize: number
  tenantId?: string | null
  tableName?: string | null
  action?: string | null
  startDate?: Date | null
  endDate?: Date | null
  appUser?: string | null
}

export async function getGlobalAuditLog(options: GetGlobalAuditLogOptions): Promise<AuditLogResult> {
  const page = Math.max(1, Number(options.page) || 1)
  const pageSize = Math.max(1, Number(options.pageSize) || 50)
  return getAuditLog({
    page,
    pageSize,
    filters: {
      tenantId: options.tenantId,
      tableName: options.tableName,
      action: options.action,
      startDate: options.startDate,
      endDate: options.endDate,
      appUser: options.appUser
    }
  })
}
