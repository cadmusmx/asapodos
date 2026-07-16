import { redirect } from 'next/navigation'

import { requirePlatformRole } from '@gaso/shared'
import { listPlans, getPlanFeatures, computeFeaturesById, mapFeatureRowToPlanFeature } from '@/services/plan-service'
import PlansPageClient from '@/components/plans/PlansPageClient'
import type { PlanFeatureMap } from '@gaso/shared/types/plan'
import type { PlanWithFeatures } from '@/components/plans/PlansPageClient'

export const dynamic = 'force-dynamic'

interface PlansPageProps {
  searchParams: Promise<{ page?: string; search?: string; status?: string }>
}

function serializePlan(plan: Parameters<typeof PlansPageClient>[0]['plans'][0]): PlanWithFeatures {
  return {
    ...plan,
    monthlyPrice: Number(plan.monthlyPrice)
  }
}

export default async function PlansPage({ searchParams }: PlansPageProps) {
  const guard = await requirePlatformRole('super_admin')

  if (!guard.ok) {
    redirect('/admin/login')
  }

  const params = await searchParams
  const search = params.search || undefined
  const status = params.status as 'active' | 'inactive' | undefined

  const plans = await listPlans(true, search, status)

  const plansWithFeatures: PlanWithFeatures[] = await Promise.all(
    plans.map(async plan => {
      const features = await getPlanFeatures(plan.id)
      const planFeatures = features.map(mapFeatureRowToPlanFeature)
      const featuresById = computeFeaturesById(features)

      return serializePlan({ ...plan, features: planFeatures, featuresById })
    })
  )

  return <PlansPageClient plans={plansWithFeatures} search={search} status={status} />
}
