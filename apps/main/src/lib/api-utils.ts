import { NextResponse } from 'next/server'

import { TenantError, getTenantIdFromHeaders, isValidTenantId, setTenantContext } from '@/lib/tenant-context'

export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json(data, { status })
}

export function errorResponse(message: string, status = 500, statusText = 'Server Error') {
  return NextResponse.json({ message }, { status, statusText })
}

export function parseIntParam(value: string | null): number | null {
  if (!value) return null
  const parsed = parseInt(value, 10)

  return isNaN(parsed) ? null : parsed
}

export function parseBoolParam(value: string | null): boolean | null {
  if (!value) return null

  return value === 'true' || value === '1' || value === '1'
}

export function getSearchParams(req: Request) {
  return new URL(req.url).searchParams
}

export function serversideResponse<T>(data: T, draw = 1) {
  return NextResponse.json({
    draw,
    recordsTotal: Array.isArray(data) ? data.length : 0,
    recordsFiltered: Array.isArray(data) ? data.length : 0,
    data
  })
}

export function getTenantIdFromRequest(req: Request): string | null {
  return getTenantIdFromHeaders(req.headers)
}

export function requireTenantId(req: Request): string {
  const tenantId = getTenantIdFromRequest(req)

  if (!tenantId) throw new TenantError('No tenant context available', 'MISSING_TENANT')

  return tenantId
}

export async function setTenantContextForRequest(req: Request): Promise<void> {
  const tenantId = getTenantIdFromRequest(req)

  if (tenantId && isValidTenantId(tenantId)) {
    await setTenantContext(tenantId)
  }
}

export async function withTenantContext<T>(req: Request, callback: () => Promise<T>): Promise<T> {
  const tenantId = getTenantIdFromRequest(req)

  if (!tenantId || !isValidTenantId(tenantId)) {
    return callback()
  }

  await setTenantContext(tenantId)

  return callback()
}

export function withTenantFilter(sql: string, tenantId: string): string {
  const safeId = tenantId.replace(/'/g, "''")

  if (sql.toUpperCase().includes('WHERE')) return `${sql} AND TenantID = '${safeId}'`

  return `${sql} WHERE TenantID = '${safeId}'`
}
