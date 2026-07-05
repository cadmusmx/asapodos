import { unstable_cache } from 'next/cache'
import { NextResponse } from 'next/server'

import { prisma } from '@gaso/shared'

export const runtime = 'nodejs'

const CACHE_TTL = Number(process.env.TENANT_CACHE_TTL_SECONDS) || 300

type TenantRow = {
  TenantID: string
  CompanyName: string | null
  isActive: boolean
  Dominio: string | null
}

const getTenantByDomain = unstable_cache(
  async (domain: string): Promise<TenantRow | null> => {
    const result = await prisma.$queryRaw<TenantRow[]>`
      SELECT 
        TenantID, 
        CompanyName, 
        (CASE
          WHEN Status = 'ACTIVE' THEN 1
          WHEN Status = 'TRIAL' THEN 1
          ELSE 0
        END) AS isActive, 
        Dominio
      FROM Security.Tenants
      WHERE LOWER(Dominio) = LOWER(${domain})
    `

    return result[0] ?? null
  },
  ['tenant-lookup'],
  { revalidate: CACHE_TTL, tags: ['tenant'] }
)

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const domain = searchParams.get('domain')

  if (!domain) {
    return NextResponse.json({ error: 'Missing domain' }, { status: 400 })
  }

  const tenant = await getTenantByDomain(domain)

  if (!tenant) {
    return NextResponse.json({ tenant: null }, { status: 200 })
  }

  return NextResponse.json({ tenant }, { status: 200 })
}
