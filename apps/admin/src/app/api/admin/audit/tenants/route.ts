import { NextResponse } from 'next/server'
import { requirePlatformRole } from '@gaso/shared'
import { prisma } from '@gaso/shared'

export const dynamic = 'force-dynamic'

export async function GET() {
  const guard = await requirePlatformRole(['super_admin', 'auditor'])

  if (!guard.ok) {
    return NextResponse.json({ message: guard.message }, { status: guard.status })
  }

  try {
    const tenants = await prisma.$queryRawUnsafe<Array<{ TenantID: string; CompanyName: string }>>(
      `SELECT TenantID, CompanyName FROM Security.Tenants ORDER BY CompanyName ASC`
    )

    return NextResponse.json({ tenants })
  } catch (error) {
    console.error('[ADMIN_AUDIT_TENANTS_ERROR]', error)
    return NextResponse.json({ message: ['Internal server error'] }, { status: 500 })
  }
}
