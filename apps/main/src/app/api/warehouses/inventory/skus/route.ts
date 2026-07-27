import { NextResponse } from 'next/server'

import { Prisma } from '@prisma/client'

import {
    PERM,
    withPermission,
    writeTransactionLog
} from '@gaso/shared'

import {
    getInventoryItemStateById,
    getInventorySkuById,
    normalizeInventorySkuFromRow
} from '@/lib/inventory/maintenance'
import {
    parseInventorySkuListFilters,
    parseInventorySkuPayload
} from '@/lib/inventory/validation'
import { withTenantContext } from '@/lib/tenant-context'

import type {
    InventorySkuRow
} from '@/types/inventory-maintenance'

export const runtime = 'nodejs'

export const GET = withPermission(
    'inventory',
    async (req, { tenantId }) => {
        let filters: ReturnType<
            typeof parseInventorySkuListFilters
        >

        try {
            filters = parseInventorySkuListFilters(
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
                            sku.TenantID =
                            CAST(
                                ${tenantId}
                                AS uniqueidentifier
                            )
                        `
                    ]

                    if (filters.searchPattern) {
                        conditions.push(
                            Prisma.sql`
                                (
                                    sku.SkuCode LIKE
                                        ${filters.searchPattern}
                                        ESCAPE '|'
                                    OR sku.ManufacturerPartNumber LIKE
                                        ${filters.searchPattern}
                                        ESCAPE '|'
                                    OR sku.UnitOfMeasure LIKE
                                        ${filters.searchPattern}
                                        ESCAPE '|'
                                    OR item.Name LIKE
                                        ${filters.searchPattern}
                                        ESCAPE '|'
                                )
                            `
                        )
                    }

                    if (filters.active !== null) {
                        conditions.push(
                            Prisma.sql`
                                sku.IsActive =
                                ${filters.active ? 1 : 0}
                            `
                        )
                    }

                    if (filters.itemId !== null) {
                        conditions.push(
                            Prisma.sql`
                                sku.ItemID =
                                ${filters.itemId}
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
                            SELECT
                                COUNT_BIG(1) AS Total
                            FROM Inventory.SKUs sku
                            INNER JOIN Inventory.Items item
                                ON item.TenantID =
                                    sku.TenantID
                                AND item.ItemID =
                                    sku.ItemID
                            ${whereClause}
                        `
                    )

                    const rows =
                        await tx.$queryRaw<
                            InventorySkuRow[]
                        >(
                            Prisma.sql`
                                SELECT
                                    sku.SkuID,
                                    sku.TenantID,
                                    sku.ItemID,
                                    item.Name
                                        AS ItemName,
                                    sku.SkuCode,
                                    sku.ManufacturerPartNumber,
                                    sku.UnitOfMeasure,
                                    sku.IsSerialized,
                                    sku.IsLotTracked,
                                    sku.IsPalletTracked,
                                    sku.AllowsReverseLogistics,
                                    sku.IsActive,
                                    ISNULL(
                                        stock.StockRecordCount,
                                        0
                                    ) AS StockRecordCount,
                                    ISNULL(
                                        stock.OnHandQuantity,
                                        0
                                    ) AS OnHandQuantity,
                                    ISNULL(
                                        stock.ReservedQuantity,
                                        0
                                    ) AS ReservedQuantity,
                                    ISNULL(
                                        stock.AvailableQuantity,
                                        0
                                    ) AS AvailableQuantity,
                                    sku.CreatedAt,
                                    sku.UpdatedAt,
                                    sku.CreatedBy,
                                    sku.UpdatedBy
                                FROM Inventory.SKUs sku
                                INNER JOIN Inventory.Items item
                                    ON item.TenantID =
                                        sku.TenantID
                                    AND item.ItemID =
                                        sku.ItemID
                                OUTER APPLY (
                                    SELECT
                                        COUNT_BIG(1)
                                            AS StockRecordCount,
                                        SUM(
                                            stockRow.OnHandQuantity
                                        ) AS OnHandQuantity,
                                        SUM(
                                            stockRow.ReservedQuantity
                                        ) AS ReservedQuantity,
                                        SUM(
                                            stockRow.AvailableQuantity
                                        ) AS AvailableQuantity
                                    FROM Inventory.InventoryStock
                                        stockRow
                                    WHERE
                                        stockRow.TenantID =
                                            sku.TenantID
                                        AND stockRow.SkuID =
                                            sku.SkuID
                                ) stock
                                ${whereClause}
                                ORDER BY
                                    sku.IsActive DESC,
                                    sku.SkuCode ASC,
                                    sku.SkuID DESC
                                OFFSET ${filters.offset}
                                    ROWS
                                FETCH NEXT
                                    ${filters.pageSize}
                                    ROWS ONLY
                            `
                        )

                    return NextResponse.json({
                        data: rows.map(
                            normalizeInventorySkuFromRow
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
                '[INVENTORY_SKUS_LIST_ERROR]',
                { message }
            )

            return NextResponse.json(
                {
                    message:
                        'Error al consultar los SKUs.'
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
        let payload: ReturnType<
            typeof parseInventorySkuPayload
        >

        try {
            payload = parseInventorySkuPayload(
                await req.json()
            )
        } catch (error) {
            return NextResponse.json(
                {
                    message:
                        error instanceof Error
                            ? error.message
                            : 'Body inválido.'
                },
                { status: 400 }
            )
        }

        try {
            const result = await withTenantContext(
                tenantId,
                async tx => {
                    const item =
                        await getInventoryItemStateById(
                            tx,
                            tenantId,
                            payload.itemId
                        )

                    if (!item) {
                        return {
                            status:
                                'ITEM_NOT_FOUND' as const
                        }
                    }

                    if (!Boolean(item.IsActive)) {
                        return {
                            status:
                                'ITEM_INACTIVE' as const,
                            itemName: item.Name
                        }
                    }

                    const insertedRows =
                        await tx.$queryRaw<
                            Array<{ SkuID: number }>
                        >(
                            Prisma.sql`
                                INSERT INTO Inventory.SKUs (
                                    TenantID,
                                    ItemID,
                                    SkuCode,
                                    ManufacturerPartNumber,
                                    UnitOfMeasure,
                                    IsSerialized,
                                    IsLotTracked,
                                    IsPalletTracked,
                                    AllowsReverseLogistics,
                                    IsActive,
                                    CreatedBy,
                                    UpdatedBy
                                )
                                OUTPUT inserted.SkuID
                                VALUES (
                                    CAST(
                                        ${tenantId}
                                        AS uniqueidentifier
                                    ),
                                    ${payload.itemId},
                                    ${payload.skuCode},
                                    ${payload.manufacturerPartNumber},
                                    ${payload.unitOfMeasure},
                                    ${payload.isSerialized ? 1 : 0},
                                    ${payload.isLotTracked ? 1 : 0},
                                    ${payload.isPalletTracked ? 1 : 0},
                                    ${payload.allowsReverseLogistics ? 1 : 0},
                                    ${payload.isActive ? 1 : 0},
                                    ${auth.userId},
                                    ${auth.userId}
                                )
                            `
                        )

                    const skuId =
                        insertedRows[0]?.SkuID

                    if (!skuId) {
                        throw new Error(
                            'INVENTORY_SKU_INSERT_FAILED'
                        )
                    }

                    const sku =
                        await getInventorySkuById(
                            tx,
                            tenantId,
                            skuId
                        )

                    if (!sku) {
                        throw new Error(
                            'INVENTORY_SKU_READ_AFTER_CREATE_FAILED'
                        )
                    }

                    return {
                        status: 'CREATED' as const,
                        sku
                    }
                }
            )

            if (
                result.status === 'ITEM_NOT_FOUND'
            ) {
                return NextResponse.json(
                    {
                        message:
                            'El artículo seleccionado no existe.'
                    },
                    { status: 404 }
                )
            }

            if (
                result.status === 'ITEM_INACTIVE'
            ) {
                return NextResponse.json(
                    {
                        message:
                            `El artículo "${result.itemName}" está inactivo.`
                    },
                    { status: 409 }
                )
            }

            writeTransactionLog({
                tenantId,
                tableName: 'Inventory.SKUs',
                action: 'CREATE',
                userId: auth.userId,
                appUser: auth.email ?? null,
                oldData: null,
                newData: result.sku
            }).catch(() => { })

            return NextResponse.json(
                { data: result.sku },
                { status: 201 }
            )
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : 'UNKNOWN_ERROR'

            if (
                message.includes(
                    'UX_Inventory_SKUs_Tenant_Code'
                )
            ) {
                return NextResponse.json(
                    {
                        message:
                            'Ya existe un SKU con ese código.'
                    },
                    { status: 409 }
                )
            }

            console.error(
                '[INVENTORY_SKU_CREATE_ERROR]',
                { message }
            )

            return NextResponse.json(
                {
                    message:
                        'Error al crear el SKU.'
                },
                { status: 500 }
            )
        }
    },
    { bit: PERM.W }
)
