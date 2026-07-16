import { NextResponse } from 'next/server'

import { getPlanFeatures, updatePlan, updatePlanFeatures, computeFeaturesById, mapFeatureRowToPlanFeature } from '@/services/plan-service'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const { planId } = await params
    const { getPlanById } = await import('@/services/plan-service')
    const plan = await getPlanById(Number(planId))

    if (!plan) {
      return NextResponse.json({ message: 'Plan not found' }, { status: 404 })
    }

    const features = await getPlanFeatures(plan.id)
    const planFeatures = features.map(mapFeatureRowToPlanFeature)
    const featuresById = computeFeaturesById(features)

    return NextResponse.json({ plan: { ...plan, features: planFeatures, featuresById } })
  } catch (error) {
    console.error('[GET_PLAN_ERROR]', error)
    return NextResponse.json({ message: 'Error loading plan' }, { status: 500 })
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const { planId } = await params
    const body = await req.json()

    const { updatePlan } = await import('@/services/plan-service')
    const result = await updatePlan(Number(planId), body)

    if (!result.ok) {
      return NextResponse.json({ message: result.error }, { status: 500 })
    }

    const { moduleIds, submoduleIds } = body
    if (Array.isArray(moduleIds) || Array.isArray(submoduleIds)) {
      await updatePlanFeatures(Number(planId), moduleIds ?? [], submoduleIds ?? [])
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[UPDATE_PLAN_ERROR]', error)
    return NextResponse.json({ message: 'Error updating plan' }, { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const { planId } = await params
    const { deactivatePlan } = await import('@/services/plan-service')
    const result = await deactivatePlan(Number(planId))

    if (!result.ok) {
      return NextResponse.json({ message: result.error }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[DEACTIVATE_PLAN_ERROR]', error)
    return NextResponse.json({ message: 'Error deactivating plan' }, { status: 500 })
  }
}
