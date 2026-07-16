import { redirect } from 'next/navigation'

import { requirePlatformRole } from '@gaso/shared'
import { getTenantById } from '@/services/tenant-service'
import { getTenantSubscription } from '@/services/subscription-service'
import { getTenantUsageWithPlanLimit } from '@/services/usage-service'
import { getTenantBillingRecords } from '@/services/billing-service'
import TenantDetailPageClient from '@/components/tenants/detail/TenantDetailPageClient'
import type { TenantRow } from '@/services/tenant-service'
import type { BillingRecord } from '@gaso/shared/types/plan'

export const dynamic = 'force-dynamic'

interface TenantDetailPageProps {
  params: Promise<{ tenantId: string }>
}

function serializeBillingRecord(record: BillingRecord): BillingRecord {
  return {
    ...record,
    amount: Number(record.amount)
  }
}

export default async function TenantDetailPage({ params }: TenantDetailPageProps) {
  const guard = await requirePlatformRole('super_admin')

  if (!guard.ok) {
    redirect('/admin/login')
  }

  const { tenantId } = await params

  const [tenant, subscription, usage, billing] = await Promise.all([
    getTenantById(tenantId),
    getTenantSubscription(tenantId),
    getTenantUsageWithPlanLimit(tenantId),
    getTenantBillingRecords(tenantId, 50)
  ])

  if (!tenant) {
    redirect('/admin/tenants')
  }

  return (
    <TenantDetailPageClient
      tenant={tenant}
      subscription={subscription}
      usage={usage}
      billingRecords={billing.map(serializeBillingRecord)}
    />
  )
}
