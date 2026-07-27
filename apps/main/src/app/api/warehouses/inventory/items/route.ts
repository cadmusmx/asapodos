import { NextResponse } from 'next/server'

import { Prisma } from '@prisma/client'

import {
    PERM,
    withPermission,
    writeTransactionLog
} from '@gaso/shared'

import {
    getInventoryItemById,
    normalizeInventoryItemFromRow
} from '@/lib/inventory/maintenance'
import {
    parseInventoryItemPayload,
    parseInventoryMaintenanceListFilters
} from '@/lib/inventory/validation'
import { withTenantContext } from '@/lib/tenant-context'

import type {
    InventoryItemRow
} from '@/types/inventory-maintenance'

export const runtime = 'nodejs'

export const GET = withPermission(
    'inventory',
    async (req, { tenantId }) => {
        let filters

        try {
            filters = parseInventoryMaintenanceListFilters(
                new URL(req.url).searchParams
            )
        } catch (error) {
            return NextResponse.json(
                {
                    message:
                        error instanceof Error
                            ? error.message
                            : 'Filtros inválidos.'
                },
                { status: 400 }
            )
        }

        try {
            return await withTenantContext(
                tenantId,
                async tx => {
                    const conditions: Prisma.Sql[] = [
                        Prisma.sql`
                            i.TenantID =
                            CAST(${tenantId} AS uniqueidentifier)
                        `
                    ]

                    if (filters.searchPattern) {
                        conditions.push(
                            Prisma.sql`
                                (
                                    i.Name LIKE
                                        ${filters.searchPattern}
                                        ESCAPE '|'
                                    OR i.Description LIKE
                                        ${filters.searchPattern}
                                        ESCAPE '|'
                                    OR i.Category LIKE
                                        ${filters.searchPattern}
                                        ESCAPE '|'
                                    OR i.Manufacturer LIKE
                                        ${filters.searchPattern}
                                        ESCAPE '|'
                                )
                            `
                        )
                    }

                    if (filters.active !== null) {
                        conditions.push(
                            Prisma.sql`
                                i.IsActive =
                                ${filters.active ? 1 : 0}
                            `
                        )
                    }

                    const whereClause = Prisma.sql`
                        WHERE ${Prisma.join(
                        conditions,
                        ' AND '
                    )}
                    `

                    const countRows = await tx.$queryRaw<
                        Array<{ Total: bigint }>
                    >(
                        Prisma.sql`
                            SELECT COUNT_BIG(1) AS Total
                            FROM Inventory.Items i
                            ${whereClause}
                        `
                    )

                    const rows = await tx.$queryRaw<
                        InventoryItemRow[]
                    >(
                        Prisma.sql`
                            SELECT
                                i.ItemID,
                                i.TenantID,
                                i.Name,
                                i.Description,
                                i.Category,
                                i.Manufacturer,
                                i.IsActive,
                                ISNULL(s.SkuCount, 0)
                                    AS SkuCount,
                                ISNULL(s.ActiveSkuCount, 0)
                                    AS ActiveSkuCount,
                                i.CreatedAt,
                                i.UpdatedAt,
                                i.CreatedBy,
                                i.UpdatedBy
                            FROM Inventory.Items i
                            OUTER APPLY (
                                SELECT
                                    COUNT_BIG(1)
                                        AS SkuCount,
                                    SUM(
                                        CAST(
                                            CASE
                                                WHEN sku.IsActive = 1
                                                    THEN 1
                                                ELSE 0
                                            END
                                            AS bigint
                                        )
                                    ) AS ActiveSkuCount
                                FROM Inventory.SKUs sku
                                WHERE
                                    sku.TenantID =
                                        i.TenantID
                                    AND sku.ItemID =
                                        i.ItemID
                            ) s
                            ${whereClause}
                            ORDER BY
                                i.IsActive DESC,
                                i.Name ASC,
                                i.ItemID DESC
                            OFFSET ${filters.offset} ROWS
                            FETCH NEXT ${filters.pageSize}
                                ROWS ONLY
                        `
                    )

                    return NextResponse.json({
                        data: rows.map(
                            normalizeInventoryItemFromRow
                        ),
                        total: Number(
                            countRows[0]?.Total ?? 0
                        ),
                        page: filters.page,
                        pageSize: filters.pageSize
                    })
                }
            )
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : 'UNKNOWN_ERROR'

            console.error(
                '[INVENTORY_ITEMS_LIST_ERROR]',
                { message }
            )

            return NextResponse.json(
                {
                    message:
                        'Error al consultar los artículos.'
                },
                { status: 500 }
            )
        }
    },
    { bit: PERM.R }
)

export const POST = withPermission(
    'inventory',
    async (req, { auth, tenantId }) => {
        let payload

        try {
            payload = parseInventoryItemPayload(
                await req.json()
            )
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : 'Body inválido.'

            return NextResponse.json(
                { message },
                { status: 400 }
            )
        }

        try {
            const item = await withTenantContext(
                tenantId,
                async tx => {
                    const insertedRows = await tx.$queryRaw<
                        Array<{ ItemID: number }>
                    >(
                        Prisma.sql`
                            INSERT INTO Inventory.Items (
                                TenantID,
                                Name,
                                Description,
                                Category,
                                Manufacturer,
                                IsActive,
                                CreatedBy,
                                UpdatedBy
                            )
                            OUTPUT inserted.ItemID
                            VALUES (
                                CAST(
                                    ${tenantId}
                                    AS uniqueidentifier
                                ),
                                ${payload.name},
                                ${payload.description},
                                ${payload.category},
                                ${payload.manufacturer},
                                ${payload.isActive ? 1 : 0},
                                ${auth.userId},
                                ${auth.userId}
                            )
                        `
                    )

                    const itemId =
                        insertedRows[0]?.ItemID

                    if (!itemId) {
                        throw new Error(
                            'INVENTORY_ITEM_INSERT_FAILED'
                        )
                    }

                    const created =
                        await getInventoryItemById(
                            tx,
                            tenantId,
                            itemId
                        )

                    if (!created) {
                        throw new Error(
                            'INVENTORY_ITEM_READ_AFTER_CREATE_FAILED'
                        )
                    }

                    return created
                }
            )

            writeTransactionLog({
                tenantId,
                tableName: 'Inventory.Items',
                action: 'CREATE',
                userId: auth.userId,
                appUser: auth.email ?? null,
                oldData: null,
                newData: item
            }).catch(() => { })

            return NextResponse.json(
                { data: item },
                { status: 201 }
            )
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : 'UNKNOWN_ERROR'

            console.error(
                '[INVENTORY_ITEM_CREATE_ERROR]',
                { message }
            )

            return NextResponse.json(
                {
                    message:
                        'Error al crear el artículo.'
                },
                { status: 500 }
            )
        }
    },
    { bit: PERM.W }
)
