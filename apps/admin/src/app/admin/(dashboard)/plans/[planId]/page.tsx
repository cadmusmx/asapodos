import { redirect } from 'next/navigation'

import { requirePlatformRole } from '@gaso/shared'
import { getPlanWithFeatures } from '@/services/plan-service'
import PlanDetailPageClient from '@/components/plans/PlanDetailPageClient'
import type { PlanWithFeatures } from '@/components/plans/PlansPageClient'

export const dynamic = 'force-dynamic'

interface PlanDetailPageProps {
  params: Promise<{ planId: string }>
}

function serializePlan(plan: PlanWithFeatures): PlanWithFeatures {
  return {
    ...plan,
    monthlyPrice: Number(plan.monthlyPrice)
  }
}

export default async function PlanDetailPage({ params }: PlanDetailPageProps) {
  const guard = await requirePlatformRole('super_admin')

  if (!guard.ok) {
    redirect('/admin/login')
  }

  const { planId } = await params
  const plan = await getPlanWithFeatures(Number(planId))

  if (!plan) {
    redirect('/admin/plans')
  }

  return <PlanDetailPageClient plan={serializePlan(plan)} />
}
