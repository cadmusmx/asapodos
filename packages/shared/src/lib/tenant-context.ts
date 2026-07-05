import type { Prisma } from '@prisma/client'

import { prisma } from './prisma'

export class TenantError extends Error {
  constructor(
    message: string,
    public readonly code: 'NOT_FOUND' | 'INACTIVE' | 'MISSING_TENANT' | 'UNAUTHORIZED' = 'MISSING_TENANT'
  ) {
    super(message)
    this.name = 'TenantError'
  }
}

export interface TenantContext {
  id: string
  slug: string
  name: string
}

export const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000000'

export function isValidTenantId(tenantId: string | null | undefined): boolean {
  return (
    !!tenantId &&
    tenantId !== DEFAULT_TENANT_ID &&
    tenantId !== '' &&
    tenantId !== '00000000-0000-0000-0000-000000000000'
  )
}

export function getTenantFromHeaders(headers: Headers): TenantContext {
  const id = headers.get('x-tenant-id') ?? ''
  const slug = headers.get('x-tenant-slug') ?? ''
  const name = headers.get('x-tenant-name') ?? ''

  if (!isValidTenantId(id)) {
    throw new TenantError('Tenant context is missing', 'MISSING_TENANT')
  }

  return { id, slug, name }
}

export function getTenantIdFromHeaders(headers: Headers): string | null {
  const id = headers.get('x-tenant-id')

  return isValidTenantId(id) ? id! : null
}

export function getTenantSlugFromHeaders(headers: Headers): string {
  return headers.get('x-tenant-slug') ?? ''
}

export function getTenantNameFromHeaders(headers: Headers): string {
  return headers.get('x-tenant-name') ?? ''
}

export function requireTenantId(headers: Headers): string {
  const id = getTenantIdFromHeaders(headers)

  if (!id) {
    const err = new Error('No tenant context available')

      ; (err as any).name = 'TenantError'
    throw err
  }

  return id
}

export async function setTenantContext(tenantId: string): Promise<void> {
  const currentContext = await prisma.$queryRaw<Array<{ CurrentTenantID: string | null }>>`
    SELECT CONVERT(nvarchar(100), SESSION_CONTEXT(N'TenantID')) AS CurrentTenantID
  `

  const currentTenantId = currentContext[0]?.CurrentTenantID ?? null

  if (currentTenantId) {
    if (currentTenantId.toLowerCase() === tenantId.toLowerCase()) {
      return
    }

    throw new TenantError('Tenant context already exists for a different tenant', 'UNAUTHORIZED')
  }

  await prisma.$executeRaw`
    DECLARE @TenantIDUnique uniqueidentifier = CAST(${tenantId} AS uniqueidentifier);
    EXEC sp_SetTenantContext @TenantID = @TenantIDUnique;
  `
}

export async function withTenantContext<T>(
  tenantId: string,
  callback: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async tx => {
    const currentContext = await tx.$queryRaw<Array<{ CurrentTenantID: string | null }>>`
      SELECT CONVERT(nvarchar(100), SESSION_CONTEXT(N'TenantID')) AS CurrentTenantID
    `

    const currentTenantId = currentContext[0]?.CurrentTenantID ?? null

    if (currentTenantId) {
      if (currentTenantId.toLowerCase() !== tenantId.toLowerCase()) {
        throw new TenantError('Tenant context already exists for a different tenant', 'UNAUTHORIZED')
      }

      return callback(tx)
    }

    await tx.$queryRaw`EXEC sp_SetTenantContext @TenantID = ${tenantId}`

    return callback(tx)
  })
}
