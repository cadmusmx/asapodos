import { revalidateTag } from 'next/cache'
import { prisma } from '@gaso/shared'
import type { PlanDefinition, PlanTier, SupportLevel, PlanFeature, PlanFeaturesById } from '@gaso/shared/types/plan'

interface PlanRow {
  PlanId: number
  Name: string
  DisplayName: string | null
  Description: string | null
  MonthlyPrice: number
  MaxUsers: number | null
  MaxBranches: number | null
  StorageMb: number | null
  SupportLevel: string
  HasAdvancedReports: number
  HasBranding: number
  IsActive: number
  SortOrder: number
}

interface FeatureRow {
  PlanFeatureId: number
  PlanId: number
  IdModulo: number | null
  IdSubModulo: number | null
  NombreModulo: string | null
  NombreSubModulo: string | null
}

export async function listPlans(
  includeInactive = false,
  search?: string,
  status?: 'active' | 'inactive'
): Promise<PlanDefinition[]> {
  if (!includeInactive && !status && !search) {
    const rows = await prisma.$queryRaw<PlanRow[]>`
      SELECT PlanId, Name, DisplayName, Description, MonthlyPrice,
             MaxUsers, MaxBranches, StorageMb, SupportLevel,
             HasAdvancedReports, HasBranding, IsActive, SortOrder
      FROM Security.Plans
      WHERE IsActive = 1
      ORDER BY SortOrder ASC
    `
    return rows.map(mapPlanRow)
  }

  if (status === 'active' && !search) {
    const rows = await prisma.$queryRaw<PlanRow[]>`
      SELECT PlanId, Name, DisplayName, Description, MonthlyPrice,
             MaxUsers, MaxBranches, StorageMb, SupportLevel,
             HasAdvancedReports, HasBranding, IsActive, SortOrder
      FROM Security.Plans
      WHERE IsActive = 1
      ORDER BY SortOrder ASC
    `
    return rows.map(mapPlanRow)
  }

  if (status === 'inactive' && !search) {
    const rows = await prisma.$queryRaw<PlanRow[]>`
      SELECT PlanId, Name, DisplayName, Description, MonthlyPrice,
             MaxUsers, MaxBranches, StorageMb, SupportLevel,
             HasAdvancedReports, HasBranding, IsActive, SortOrder
      FROM Security.Plans
      WHERE IsActive = 0
      ORDER BY SortOrder ASC
    `
    return rows.map(mapPlanRow)
  }

  if (search && !status) {
    const rows = await prisma.$queryRaw<PlanRow[]>`
      SELECT PlanId, Name, DisplayName, Description, MonthlyPrice,
             MaxUsers, MaxBranches, StorageMb, SupportLevel,
             HasAdvancedReports, HasBranding, IsActive, SortOrder
      FROM Security.Plans
      WHERE (Name LIKE ${`%${search}%`} OR DisplayName LIKE ${`%${search}%`})
      ORDER BY SortOrder ASC
    `
    return rows.map(mapPlanRow)
  }

  if (search && status === 'active') {
    const rows = await prisma.$queryRaw<PlanRow[]>`
      SELECT PlanId, Name, DisplayName, Description, MonthlyPrice,
             MaxUsers, MaxBranches, StorageMb, SupportLevel,
             HasAdvancedReports, HasBranding, IsActive, SortOrder
      FROM Security.Plans
      WHERE IsActive = 1 AND (Name LIKE ${`%${search}%`} OR DisplayName LIKE ${`%${search}%`})
      ORDER BY SortOrder ASC
    `
    return rows.map(mapPlanRow)
  }

  if (search && status === 'inactive') {
    const rows = await prisma.$queryRaw<PlanRow[]>`
      SELECT PlanId, Name, DisplayName, Description, MonthlyPrice,
             MaxUsers, MaxBranches, StorageMb, SupportLevel,
             HasAdvancedReports, HasBranding, IsActive, SortOrder
      FROM Security.Plans
      WHERE IsActive = 0 AND (Name LIKE ${`%${search}%`} OR DisplayName LIKE ${`%${search}%`})
      ORDER BY SortOrder ASC
    `
    return rows.map(mapPlanRow)
  }

  const rows = await prisma.$queryRaw<PlanRow[]>`
    SELECT PlanId, Name, DisplayName, Description, MonthlyPrice,
           MaxUsers, MaxBranches, StorageMb, SupportLevel,
           HasAdvancedReports, HasBranding, IsActive, SortOrder
    FROM Security.Plans
    ORDER BY SortOrder ASC
  `
  return rows.map(mapPlanRow)
}

export async function getPlanById(planId: number): Promise<PlanDefinition | null> {
  const [row] = await prisma.$queryRaw<PlanRow[]>`
    SELECT PlanId, Name, DisplayName, Description, MonthlyPrice,
           MaxUsers, MaxBranches, StorageMb, SupportLevel,
           HasAdvancedReports, HasBranding, IsActive, SortOrder
    FROM Security.Plans
    WHERE PlanId = ${planId} AND IsActive = 1
  `

  return row ? mapPlanRow(row) : null
}

export async function getPlanFeatures(planId: number): Promise<FeatureRow[]> {
  return prisma.$queryRaw<FeatureRow[]>`
    SELECT
      pf.PlanFeatureId,
      pf.PlanId,
      pf.IdModulo,
      pf.IdSubModulo,
      m.NombreModulo,
      sm.NombreSubModulo
    FROM Security.PlanFeatures pf
    LEFT JOIN dbo.Cat_Modulos m ON m.IdModulo = pf.IdModulo
    LEFT JOIN dbo.Cat_SubModulos sm ON sm.IdSubModulo = pf.IdSubModulo
    WHERE pf.PlanId = ${planId}
  `
}

export function computeFeaturesById(features: FeatureRow[]): PlanFeaturesById {
  const modules: Record<number, boolean> = {}
  const submodules: Record<number, boolean> = {}

  for (const f of features) {
    if (f.IdSubModulo != null) {
      submodules[f.IdSubModulo] = true
    }
    if (f.IdModulo != null) {
      modules[f.IdModulo] = true
    }
  }

  return { modules, submodules }
}

export function mapFeatureRowToPlanFeature(f: FeatureRow): PlanFeature {
  return {
    planFeatureId: f.PlanFeatureId,
    planId: f.PlanId,
    idModulo: f.IdModulo,
    idSubModulo: f.IdSubModulo,
    nombreModulo: f.NombreModulo,
    nombreSubModulo: f.NombreSubModulo,
  }
}

export async function createPlan(data: {
  name: string
  displayName: string
  description?: string
  monthlyPrice: number
  maxUsers: number | null
  maxBranches: number | null
  storageMb: number | null
  supportLevel: SupportLevel
  hasAdvancedReports: boolean
  hasBranding: boolean
  moduleIds: number[]
  submoduleIds: number[]
}): Promise<{ ok: boolean; planId?: number; error?: string }> {
  try {
    const [planId] = await prisma.$queryRaw<[{ PlanId: number }]>`
      INSERT INTO Security.Plans (
        Name, DisplayName, Description, MonthlyPrice,
        MaxUsers, MaxBranches, StorageMb, SupportLevel,
        HasAdvancedReports, HasBranding, IsActive, SortOrder
      )
      OUTPUT INSERTED.PlanId
      VALUES (
        ${data.name}, ${data.displayName}, ${data.description ?? null},
        ${data.monthlyPrice}, ${data.maxUsers}, ${data.maxBranches},
        ${data.storageMb}, ${data.supportLevel},
        ${data.hasAdvancedReports ? 1 : 0}, ${data.hasBranding ? 1 : 0},
        1,
        (SELECT COALESCE(MAX(SortOrder), 0) + 1 FROM Security.Plans WHERE IsActive = 1)
      )
    `

    for (const moduleId of data.moduleIds) {
      await prisma.$executeRaw`
        INSERT INTO Security.PlanFeatures (PlanId, IdModulo)
        VALUES (${planId.PlanId}, ${moduleId})
      `
    }

    for (const submoduleId of data.submoduleIds) {
      await prisma.$executeRaw`
        INSERT INTO Security.PlanFeatures (PlanId, IdSubModulo)
        VALUES (${planId.PlanId}, ${submoduleId})
      `
    }

    revalidateTag('plans')
    return { ok: true, planId: planId.PlanId }
  } catch (error) {
    console.error('[CREATE_PLAN_ERROR]', error)
    return { ok: false, error: 'INTERNAL_ERROR' }
  }
}

export async function updatePlan(
  planId: number,
  data: Partial<{
    displayName: string
    description: string | null
    monthlyPrice: number
    maxUsers: number | null
    maxBranches: number | null
    storageMb: number | null
    supportLevel: SupportLevel
    hasAdvancedReports: boolean
    hasBranding: boolean
  }>
): Promise<{ ok: boolean; error?: string }> {
  try {
    const updates: string[] = []
    const params: (string | number | null)[] = []
    let i = 1

    if (data.displayName !== undefined) {
      params.push(data.displayName)
      updates.push(`DisplayName = @p${i++}`)
    }
    if (data.description !== undefined) {
      params.push(data.description)
      updates.push(`Description = @p${i++}`)
    }
    if (data.monthlyPrice !== undefined) {
      params.push(data.monthlyPrice)
      updates.push(`MonthlyPrice = @p${i++}`)
    }
    if (data.maxUsers !== undefined) {
      params.push(data.maxUsers)
      updates.push(`MaxUsers = @p${i++}`)
    }
    if (data.maxBranches !== undefined) {
      params.push(data.maxBranches)
      updates.push(`MaxBranches = @p${i++}`)
    }
    if (data.storageMb !== undefined) {
      params.push(data.storageMb)
      updates.push(`StorageMb = @p${i++}`)
    }
    if (data.supportLevel !== undefined) {
      params.push(data.supportLevel)
      updates.push(`SupportLevel = @p${i++}`)
    }
    if (data.hasAdvancedReports !== undefined) {
      params.push(data.hasAdvancedReports ? 1 : 0)
      updates.push(`HasAdvancedReports = @p${i++}`)
    }
    if (data.hasBranding !== undefined) {
      params.push(data.hasBranding ? 1 : 0)
      updates.push(`HasBranding = @p${i++}`)
    }

    if (updates.length === 0) {
      return { ok: true }
    }

    params.push(planId)
    updates.push(`UpdatedAt = SYSUTCDATETIME()`)

    await prisma.$executeRawUnsafe(
      `UPDATE Security.Plans SET ${updates.join(', ')} WHERE PlanId = @p${i}`,
      ...params
    )

    revalidateTag('plans')
    return { ok: true }
  } catch (error) {
    console.error('[UPDATE_PLAN_ERROR]', error)
    return { ok: false, error: 'INTERNAL_ERROR' }
  }
}

export async function updatePlanFeatures(
  planId: number,
  moduleIds: number[],
  submoduleIds: number[]
): Promise<{ ok: boolean; error?: string }> {
  try {
    const uniqueModuleIds = new Set(moduleIds)

    if (submoduleIds.length > 0) {
      const submoduleParentRows = await prisma.$queryRawUnsafe<{ IdModulo: number; IdSubModulo: number }[]>(
        `SELECT DISTINCT IdModulo, IdSubModulo FROM dbo.Cat_SubModulos WHERE IdSubModulo IN (${submoduleIds.join(',')})`
      )

      for (const row of submoduleParentRows) {
        if (row.IdModulo != null) {
          uniqueModuleIds.add(row.IdModulo)
        }
      }
    }

    await prisma.$executeRaw`
      DELETE FROM Security.PlanFeatures
      WHERE PlanId = ${planId}
    `

    for (const moduleId of Array.from(uniqueModuleIds)) {
      await prisma.$executeRaw`
        INSERT INTO Security.PlanFeatures (PlanId, IdModulo)
        VALUES (${planId}, ${moduleId})
      `
    }

    for (const submoduleId of submoduleIds) {
      await prisma.$executeRaw`
        INSERT INTO Security.PlanFeatures (PlanId, IdSubModulo)
        VALUES (${planId}, ${submoduleId})
      `
    }

    revalidateTag('plans')
    return { ok: true }
  } catch (error) {
    console.error('[UPDATE_PLAN_FEATURES_ERROR]', error)
    return { ok: false, error: 'INTERNAL_ERROR' }
  }
}

export async function getPlanWithFeatures(planId: number) {
  const plan = await getPlanById(planId)
  if (!plan) return null

  const features = await getPlanFeatures(planId)
  const planFeatures = features.map(mapFeatureRowToPlanFeature)
  const featuresById = computeFeaturesById(features)

  return { ...plan, features: planFeatures, featuresById }
}

export async function deactivatePlan(planId: number): Promise<{ ok: boolean; error?: string }> {
  try {
    await prisma.$executeRaw`
      UPDATE Security.Plans SET IsActive = 0, UpdatedAt = SYSUTCDATETIME()
      WHERE PlanId = ${planId}
    `
    revalidateTag('plans')
    return { ok: true }
  } catch (error) {
    console.error('[DEACTIVATE_PLAN_ERROR]', error)
    return { ok: false, error: 'INTERNAL_ERROR' }
  }
}

export async function activatePlan(planId: number): Promise<{ ok: boolean; error?: string }> {
  try {
    await prisma.$executeRaw`
      UPDATE Security.Plans SET IsActive = 1, UpdatedAt = SYSUTCDATETIME()
      WHERE PlanId = ${planId}
    `
    revalidateTag('plans')
    return { ok: true }
  } catch (error) {
    console.error('[ACTIVATE_PLAN_ERROR]', error)
    return { ok: false, error: 'INTERNAL_ERROR' }
  }
}

function mapPlanRow(row: PlanRow): PlanDefinition {
  return {
    id: row.PlanId,
    name: row.Name as PlanTier,
    displayName: row.DisplayName ?? row.Name,
    description: row.Description,
    monthlyPrice: row.MonthlyPrice,
    limits: {
      maxUsers: row.MaxUsers,
      maxBranches: row.MaxBranches,
      storageMb: row.StorageMb,
    },
    supportLevel: row.SupportLevel as SupportLevel,
    hasAdvancedReports: Boolean(row.HasAdvancedReports),
    hasBranding: Boolean(row.HasBranding),
    isActive: Boolean(row.IsActive),
    sortOrder: row.SortOrder,
  }
}
