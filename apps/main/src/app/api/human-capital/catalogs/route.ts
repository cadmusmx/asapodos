import { NextResponse } from 'next/server'

import { Prisma } from '@prisma/client'

import { PERM, withPermission } from '@gaso/shared'

import { withTenantContext } from '@/lib/tenant-context'
import {
    normalizeDepartmentFromRow,
    normalizePositionFromRow
} from '@/lib/human-capital/normalize'

import type {
    HumanCapitalDepartmentRow,
    HumanCapitalPositionRow
} from '@/types/human-capital'

export const runtime = 'nodejs'

export const GET = withPermission(
    'employees',
    async (_req, { tenantId }) => {
        const result = await withTenantContext(tenantId, async tx => {
            const departments = await tx.$queryRaw<HumanCapitalDepartmentRow[]>(
                Prisma.sql`
          SELECT
            DepartmentID,
            TenantID,
            Name,
            Description,
            IsActive,
            CreatedAt,
            UpdatedAt,
            CreatedBy,
            UpdatedBy
          FROM HumanCapital.Departments
          WHERE TenantID = CAST(${tenantId} AS uniqueidentifier)
            AND IsActive = 1
          ORDER BY Name ASC
        `
            )

            const positions = await tx.$queryRaw<HumanCapitalPositionRow[]>(
                Prisma.sql`
          SELECT
            p.PositionID,
            p.TenantID,
            p.DepartmentID,
            d.Name AS DepartmentName,
            p.Name,
            p.Description,
            p.IsActive,
            p.CreatedAt,
            p.UpdatedAt,
            p.CreatedBy,
            p.UpdatedBy
          FROM HumanCapital.Positions p
          LEFT JOIN HumanCapital.Departments d
            ON d.TenantID = p.TenantID
            AND d.DepartmentID = p.DepartmentID
          WHERE p.TenantID = CAST(${tenantId} AS uniqueidentifier)
            AND p.IsActive = 1
          ORDER BY p.Name ASC
        `
            )

            return {
                departments: departments.map(normalizeDepartmentFromRow),
                positions: positions.map(normalizePositionFromRow)
            }
        })

        return NextResponse.json(result)
    },
    { bit: PERM.R }
)
