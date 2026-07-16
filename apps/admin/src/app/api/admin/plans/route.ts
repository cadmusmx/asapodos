import { NextResponse } from 'next/server'

import { listPlans, getPlanFeatures, createPlan, computeFeaturesById, mapFeatureRowToPlanFeature } from '@/services/plan-service'
import type { SupportLevel } from '@gaso/shared/types/plan'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || undefined
    const status = searchParams.get('status') as 'active' | 'inactive' | undefined

    const plans = await listPlans(false, search, status)

    const plansWithFeatures = await Promise.all(
      plans.map(async plan => {
        const features = await getPlanFeatures(plan.id)
        const planFeatures = features.map(mapFeatureRowToPlanFeature)
        const featuresById = computeFeaturesById(features)
        return { ...plan, features: planFeatures, featuresById }
      })
    )

    return NextResponse.json({ plans: plansWithFeatures })
  } catch (error) {
    console.error('[LIST_PLANS_ERROR]', error)
    return NextResponse.json({ message: 'Error loading plans' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const {
      name,
      displayName,
      description,
      monthlyPrice,
      maxUsers,
      maxBranches,
      storageMb,
      supportLevel,
      hasAdvancedReports,
      hasBranding,
      moduleIds,
      submoduleIds,
    } = body

    if (!name || !displayName || monthlyPrice === undefined) {
      return NextResponse.json(
        { message: 'name, displayName, and monthlyPrice are required' },
        { status: 400 }
      )
    }

    if (!Array.isArray(moduleIds) || !Array.isArray(submoduleIds)) {
      return NextResponse.json(
        { message: 'moduleIds and submoduleIds must be arrays' },
        { status: 400 }
      )
    }

    const validSupportLevels: SupportLevel[] = ['email', 'priority', 'dedicated']
    if (supportLevel && !validSupportLevels.includes(supportLevel)) {
      return NextResponse.json({ message: 'Invalid supportLevel' }, { status: 400 })
    }

    const result = await createPlan({
      name,
      displayName,
      description,
      monthlyPrice: Number(monthlyPrice),
      maxUsers: maxUsers !== undefined && maxUsers !== null ? Number(maxUsers) : null,
      maxBranches: maxBranches !== undefined && maxBranches !== null ? Number(maxBranches) : null,
      storageMb: storageMb !== undefined && storageMb !== null ? Number(storageMb) : null,
      supportLevel: supportLevel ?? 'email',
      hasAdvancedReports: Boolean(hasAdvancedReports),
      hasBranding: Boolean(hasBranding),
      moduleIds: moduleIds ?? [],
      submoduleIds: submoduleIds ?? [],
    })

    if (!result.ok) {
      return NextResponse.json({ message: result.error }, { status: 500 })
    }

    return NextResponse.json({ planId: result.planId }, { status: 201 })
  } catch (error) {
    console.error('[CREATE_PLAN_ERROR]', error)
    return NextResponse.json({ message: 'Error creating plan' }, { status: 500 })
  }
}
