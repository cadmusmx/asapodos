import { revalidateTag } from 'next/cache'
import { prisma, writeTransactionLog } from '@gaso/shared'
import type { PlatformRole } from '@gaso/shared'

export type TenantStatus = 'ACTIVE' | 'SUSPENDED' | 'INACTIVE' | 'TRIAL'

export interface TenantRow {
  TenantID: string
  CompanyName: string
  Dominio: string
  Status: TenantStatus
  SubscriptionPlan: string | null
  MaxUsers: number | null
  CreatedAt: Date | null
  UpdatedAt: Date | null
  SuspendedAt: Date | null
  SuspendedReason: string | null
  SuspendedMessage: string | null
  Region: string | null
  isActive: number
}

export interface TenantListResult {
  tenants: TenantRow[]
  total: number
}

export interface TenantOperationResult {
  ok: boolean
  error?: 'TENANT_NOT_FOUND' | 'CANNOT_SUSPEND_INACTIVE_TENANT' | 'CANNOT_ACTIVATE_INACTIVE_TENANT' | 'CANNOT_DEACTIVATE_SUSPENDED_TENANT' | 'ALREADY_ACTIVE' | 'ALREADY_SUSPENDED' | 'ALREADY_INACTIVE' | 'INTERNAL_ERROR'
  tenantId?: string
}

interface ListTenantsOptions {
  page: number
  pageSize: number
  status?: TenantStatus | null
  search?: string | null
  sortField?: string
  sortDir?: 'asc' | 'desc'
}

export async function listTenants({
  page = 1,
  pageSize = 20,
  status,
  search,
  sortField = 'CreatedAt',
  sortDir = 'desc'
}: ListTenantsOptions): Promise<TenantListResult> {
  const offset = (page - 1) * pageSize

  const allowedSortFields: Record<string, string> = {
    CompanyName: 't.CompanyName',
    Status: 't.Status',
    CreatedAt: 't.CreatedAt',
    SubscriptionPlan: 't.SubscriptionPlan'
  }
  const safeSortField = allowedSortFields[sortField] || 't.CreatedAt'
  const safeSortDir = sortDir === 'asc' ? 'ASC' : 'DESC'

  let whereClause = ''
  const params: (string | number)[] = []

  if (status) {
    params.push(status)
    whereClause += ` AND t.Status = @p${params.length}`
  }

  if (search) {
    params.push(`%${search}%`)
    whereClause += ` AND (t.CompanyName LIKE @p${params.length} OR t.Dominio LIKE @p${params.length})`
  }

  const countParams = [...params]
  const dataParams = [...params, offset, pageSize]

  const [tenants, totalResult] = await Promise.all([
    prisma.$queryRawUnsafe<TenantRow[]>(`
      SELECT
        t.TenantID,
        t.CompanyName,
        t.Dominio,
        t.Status,
        t.SubscriptionPlan,
        t.MaxUsers,
        t.CreatedAt,
        t.UpdatedAt,
        t.SuspendedAt,
        t.SuspendedReason,
        t.SuspendedMessage,
        t.Region,
        CAST(CASE WHEN t.Status IN ('ACTIVE', 'TRIAL') THEN 1 ELSE 0 END AS INT) AS isActive
      FROM Security.Tenants t
      WHERE 1=1 ${whereClause}
      ORDER BY ${safeSortField} ${safeSortDir}
      OFFSET @p${dataParams.length - 1} ROWS FETCH NEXT @p${dataParams.length} ROWS ONLY
    `, ...dataParams),
    prisma.$queryRawUnsafe<Array<{ total: number }>>(`
      SELECT COUNT(*) as total
      FROM Security.Tenants t
      WHERE 1=1 ${whereClause}
    `, ...countParams)
  ])

  return {
    tenants,
    total: Number(totalResult[0]?.total) || 0
  }
}

export async function getTenantById(tenantId: string): Promise<TenantRow | null> {
  const [tenant] = await prisma.$queryRawUnsafe<TenantRow[]>(`
    SELECT 
      t.TenantID,
      t.CompanyName,
      t.Dominio,
      t.Status,
      t.SubscriptionPlan,
      t.MaxUsers,
      t.CreatedAt,
      t.UpdatedAt,
      t.SuspendedAt,
      t.SuspendedReason,
      t.SuspendedMessage,
      t.Region,
      CAST(CASE WHEN t.Status IN ('ACTIVE', 'TRIAL') THEN 1 ELSE 0 END AS INT) AS isActive
    FROM Security.Tenants t
    WHERE t.TenantID = CAST(@p1 AS uniqueidentifier)
  `, tenantId)

  return tenant ?? null
}

interface CreateTenantOptions {
  companyName: string
  dominio: string
  subscriptionPlan?: string
  maxUsers?: number
  region?: string
  adminUserId: number
  adminEmail: string
}

export async function createTenant(options: CreateTenantOptions): Promise<{ ok: boolean; tenantId?: string; error?: string }> {
  const { companyName, dominio, subscriptionPlan, maxUsers, region, adminUserId, adminEmail } = options

  try {
    const tenantId = crypto.randomUUID()

    await prisma.$executeRawUnsafe(`
      INSERT INTO Security.Tenants (
        TenantID, CompanyName, Dominio, Status, SubscriptionPlan, MaxUsers, Region, CreatedAt, UpdatedAt
      ) VALUES (
        CAST(@p1 AS uniqueidentifier),
        @p2,
        @p3,
        'ACTIVE',
        @p4,
        @p5,
        @p6,
        SYSUTCDATETIME(),
        SYSUTCDATETIME()
      )
    `, tenantId, companyName, dominio, subscriptionPlan ?? null, maxUsers ?? null, region ?? null)

    await writeTransactionLog({
      tenantId,
      tableName: 'Security.Tenants',
      action: 'TEN_CR',
      userId: adminUserId,
      newData: { companyName, dominio, subscriptionPlan, maxUsers, region },
      appUser: adminEmail,
    })

    revalidateTag('tenant')

    return { ok: true, tenantId }
  } catch (error) {
    console.error('[CREATE_TENANT_ERROR]', error)
    return { ok: false, error: 'INTERNAL_ERROR' }
  }
}

interface UpdateTenantOptions {
  tenantId: string
  companyName?: string
  dominio?: string
  subscriptionPlan?: string | null
  maxUsers?: number | null
  region?: string | null
  adminUserId: number
  adminEmail: string
}

export async function updateTenant(options: UpdateTenantOptions): Promise<TenantOperationResult> {
  const { tenantId, companyName, dominio, subscriptionPlan, maxUsers, region, adminUserId, adminEmail } = options

  try {
    const tenant = await getTenantById(tenantId)
    if (!tenant) {
      return { ok: false, error: 'TENANT_NOT_FOUND' }
    }

    const updates: string[] = []
    const params: (string | number | null)[] = []
    let paramIndex = 1

    if (companyName !== undefined) {
      params.push(companyName)
      updates.push(`CompanyName = @p${paramIndex++}`)
    }
    if (dominio !== undefined) {
      params.push(dominio)
      updates.push(`Dominio = @p${paramIndex++}`)
    }
    if (subscriptionPlan !== undefined) {
      params.push(subscriptionPlan)
      updates.push(`SubscriptionPlan = @p${paramIndex++}`)
    }
    if (maxUsers !== undefined) {
      params.push(maxUsers)
      updates.push(`MaxUsers = @p${paramIndex++}`)
    }
    if (region !== undefined) {
      params.push(region)
      updates.push(`Region = @p${paramIndex++}`)
    }

    if (updates.length === 0) {
      return { ok: true, tenantId }
    }

    params.push(tenantId)

    await prisma.$executeRawUnsafe(`
      UPDATE Security.Tenants 
      SET ${updates.join(', ')}, UpdatedAt = SYSUTCDATETIME()
      WHERE TenantID = CAST(@p${paramIndex} AS uniqueidentifier)
    `, ...params)

    const newData: Record<string, unknown> = {}
    if (companyName) newData.companyName = companyName
    if (dominio) newData.dominio = dominio
    if (subscriptionPlan !== undefined) newData.subscriptionPlan = subscriptionPlan
    if (maxUsers !== undefined) newData.maxUsers = maxUsers
    if (region !== undefined) newData.region = region

    await writeTransactionLog({
      tenantId,
      tableName: 'Security.Tenants',
      action: 'TEN_UP',
      userId: adminUserId,
      oldData: tenant,
      newData,
      appUser: adminEmail,
    })

    revalidateTag('tenant')

    return { ok: true, tenantId }
  } catch (error) {
    console.error('[UPDATE_TENANT_ERROR]', error)
    return { ok: false, error: 'INTERNAL_ERROR' }
  }
}

export async function suspendTenant(
  tenantId: string,
  adminUserId: number,
  adminEmail: string,
  reason: string
): Promise<TenantOperationResult> {
  try {
    const tenant = await getTenantById(tenantId)

    if (!tenant) {
      return { ok: false, error: 'TENANT_NOT_FOUND' }
    }

    if (tenant.Status === 'INACTIVE') {
      return { ok: false, error: 'CANNOT_SUSPEND_INACTIVE_TENANT' }
    }

    if (tenant.Status === 'SUSPENDED') {
      return { ok: false, error: 'ALREADY_SUSPENDED' }
    }

    const previousStatus = tenant.Status

    await prisma.$executeRawUnsafe(`
      UPDATE Security.Tenants 
      SET Status = 'SUSPENDED', 
          SuspendedAt = SYSUTCDATETIME(),
          SuspendedReason = @p1,
          UpdatedAt = SYSUTCDATETIME()
      WHERE TenantID = CAST(@p2 AS uniqueidentifier)
    `, reason, tenantId)

    await writeTransactionLog({
      tenantId,
      tableName: 'Security.Tenants',
      action: 'TEN_SUSP',
      userId: adminUserId,
      oldData: { status: previousStatus },
      newData: { status: 'SUSPENDED', reason },
      appUser: adminEmail,
    })

    revalidateTag('tenant')

    return { ok: true, tenantId }
  } catch (error) {
    console.error('[SUSPEND_TENANT_ERROR]', error)
    return { ok: false, error: 'INTERNAL_ERROR' }
  }
}

export async function activateTenant(
  tenantId: string,
  adminUserId: number,
  adminEmail: string
): Promise<TenantOperationResult> {
  try {
    const tenant = await getTenantById(tenantId)

    if (!tenant) {
      return { ok: false, error: 'TENANT_NOT_FOUND' }
    }

    if (tenant.Status === 'INACTIVE') {
      return { ok: false, error: 'CANNOT_ACTIVATE_INACTIVE_TENANT' }
    }

    if (tenant.Status === 'ACTIVE') {
      return { ok: false, error: 'ALREADY_ACTIVE' }
    }

    const previousStatus = tenant.Status

    await prisma.$executeRawUnsafe(`
      UPDATE Security.Tenants 
      SET Status = 'ACTIVE', 
          SuspendedAt = NULL,
          SuspendedReason = NULL,
          UpdatedAt = SYSUTCDATETIME()
      WHERE TenantID = CAST(@p1 AS uniqueidentifier)
    `, tenantId)

    await writeTransactionLog({
      tenantId,
      tableName: 'Security.Tenants',
      action: 'TEN_ACT',
      userId: adminUserId,
      oldData: { status: previousStatus },
      newData: { status: 'ACTIVE' },
      appUser: adminEmail,
    })

    revalidateTag('tenant')

    return { ok: true, tenantId }
  } catch (error) {
    console.error('[ACTIVATE_TENANT_ERROR]', error)
    return { ok: false, error: 'INTERNAL_ERROR' }
  }
}

export async function deactivateTenant(
  tenantId: string,
  adminUserId: number,
  adminEmail: string
): Promise<TenantOperationResult> {
  try {
    const tenant = await getTenantById(tenantId)

    if (!tenant) {
      return { ok: false, error: 'TENANT_NOT_FOUND' }
    }

    if (tenant.Status === 'INACTIVE') {
      return { ok: false, error: 'ALREADY_INACTIVE' }
    }

    const previousStatus = tenant.Status

    await prisma.$executeRawUnsafe(`
      UPDATE Security.Tenants 
      SET Status = 'INACTIVE', 
          SuspendedAt = NULL,
          SuspendedReason = NULL,
          UpdatedAt = SYSUTCDATETIME()
      WHERE TenantID = CAST(@p1 AS uniqueidentifier)
    `, tenantId)

    await writeTransactionLog({
      tenantId,
      tableName: 'Security.Tenants',
      action: 'TEN_DEA',
      userId: adminUserId,
      oldData: { status: previousStatus },
      newData: { status: 'INACTIVE' },
      appUser: adminEmail,
    })

    revalidateTag('tenant')

    return { ok: true, tenantId }
  } catch (error) {
    console.error('[DEACTIVATE_TENANT_ERROR]', error)
    return { ok: false, error: 'INTERNAL_ERROR' }
  }
}
