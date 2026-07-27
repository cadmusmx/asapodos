import { NextResponse } from 'next/server'

import { Prisma } from '@prisma/client'

import { PERM, withPermission } from '@gaso/shared'

import {
    InventoryQueryValidationError,
    normalizeInventoryListSummary,
    normalizeInventoryStockRow,
    parseInventoryListFilters
} from '@/lib/inventory/normalize'
import { withTenantContext } from '@/lib/tenant-context'

import type {
    InventoryListSummaryRow,
    InventoryStockRow
} from '@/types/inventory'

export const runtime = 'nodejs'

/**
 * GET /api/warehouses/inventory
 *
 * Consulta paginada del inventario actual por tenant, almacén,
 * SKU y estado de stock.
 *
 * Filtros soportados:
 * - search
 * - warehouseId
 * - stockStatus
 * - category
 * - active
 * - page
 * - pageSize
 *
 * Esta ruta es únicamente de lectura. Las cantidades no deben
 * modificarse directamente desde este endpoint.
 */
export const GET = withPermission(
    'inventory',
    async (req, { tenantId }) => {
        let filters

        try {
            const { searchParams } = new URL(req.url)

            filters = parseInventoryListFilters(searchParams)
        } catch (error) {
            if (error instanceof InventoryQueryValidationError) {
                return NextResponse.json(
                    {
                        message: error.message
                    },
                    {
                        status: 400
                    }
                )
            }

            throw error
        }

        try {
            return await withTenantContext(tenantId, async tx => {
                const conditions: Prisma.Sql[] = [
                    Prisma.sql`
                        stock.TenantID =
                        CAST(${tenantId} AS uniqueidentifier)
                    `
                ]

                if (filters.searchPattern) {
                    conditions.push(
                        Prisma.sql`
                            (
                                sku.SkuCode
                                    LIKE ${filters.searchPattern} ESCAPE '|'
                                OR sku.ManufacturerPartNumber
                                    LIKE ${filters.searchPattern} ESCAPE '|'
                                OR item.Name
                                    LIKE ${filters.searchPattern} ESCAPE '|'
                                OR item.Description
                                    LIKE ${filters.searchPattern} ESCAPE '|'
                                OR item.Category
                                    LIKE ${filters.searchPattern} ESCAPE '|'
                                OR item.Manufacturer
                                    LIKE ${filters.searchPattern} ESCAPE '|'
                                OR warehouse.Code
                                    LIKE ${filters.searchPattern} ESCAPE '|'
                                OR warehouse.Name
                                    LIKE ${filters.searchPattern} ESCAPE '|'
                                OR warehouse.Region
                                    LIKE ${filters.searchPattern} ESCAPE '|'
                            )
                        `
                    )
                }

                if (filters.warehouseId !== null) {
                    conditions.push(
                        Prisma.sql`
                            stock.WarehouseID = ${filters.warehouseId}
                        `
                    )
                }

                if (filters.stockStatus !== null) {
                    conditions.push(
                        Prisma.sql`
                            stock.StockStatus = ${filters.stockStatus}
                        `
                    )
                }

                if (filters.category !== null) {
                    conditions.push(
                        Prisma.sql`
                            item.Category = ${filters.category}
                        `
                    )
                }

                /*
                 * En esta primera versión, active representa el estado
                 * del SKU. El estado del artículo y del almacén también
                 * se devuelve en la respuesta para la interfaz.
                 */
                if (filters.active !== null) {
                    conditions.push(
                        Prisma.sql`
                            sku.IsActive = ${filters.active ? 1 : 0}
                        `
                    )
                }

                const whereClause = Prisma.sql`
                    WHERE ${Prisma.join(conditions, ' AND ')}
                `

                const summaryRows =
                    await tx.$queryRaw<InventoryListSummaryRow[]>(
                        Prisma.sql`
                            SELECT
                                COUNT_BIG(1) AS TotalRows,
                                COUNT(DISTINCT sku.SkuID) AS TotalSkus,
                                SUM(stock.OnHandQuantity)
                                    AS OnHandQuantity,
                                SUM(stock.ReservedQuantity)
                                    AS ReservedQuantity,
                                SUM(stock.AvailableQuantity)
                                    AS AvailableQuantity
                            FROM Inventory.InventoryStock AS stock
                            INNER JOIN Warehouses.Warehouses AS warehouse
                                ON warehouse.TenantID = stock.TenantID
                                AND warehouse.WarehouseID =
                                    stock.WarehouseID
                            INNER JOIN Inventory.SKUs AS sku
                                ON sku.TenantID = stock.TenantID
                                AND sku.SkuID = stock.SkuID
                            INNER JOIN Inventory.Items AS item
                                ON item.TenantID = sku.TenantID
                                AND item.ItemID = sku.ItemID
                            ${whereClause}
                        `
                    )

                const rows = await tx.$queryRaw<InventoryStockRow[]>(
                    Prisma.sql`
                        SELECT
                            stock.InventoryStockID,

                            warehouse.WarehouseID,
                            warehouse.Code AS WarehouseCode,
                            warehouse.Name AS WarehouseName,
                            warehouse.Region AS WarehouseRegion,
                            warehouse.IsActive AS WarehouseIsActive,

                            item.ItemID,
                            item.Name AS ItemName,
                            item.Description AS ItemDescription,
                            item.Category,
                            item.Manufacturer,
                            item.IsActive AS ItemIsActive,

                            sku.SkuID,
                            sku.SkuCode,
                            sku.ManufacturerPartNumber,
                            sku.UnitOfMeasure,
                            sku.IsSerialized,
                            sku.IsLotTracked,
                            sku.IsPalletTracked,
                            sku.AllowsReverseLogistics,
                            sku.IsActive AS SkuIsActive,

                            stock.StockStatus,
                            stock.OnHandQuantity,
                            stock.ReservedQuantity,
                            stock.AvailableQuantity,
                            stock.UpdatedAt
                        FROM Inventory.InventoryStock AS stock
                        INNER JOIN Warehouses.Warehouses AS warehouse
                            ON warehouse.TenantID = stock.TenantID
                            AND warehouse.WarehouseID =
                                stock.WarehouseID
                        INNER JOIN Inventory.SKUs AS sku
                            ON sku.TenantID = stock.TenantID
                            AND sku.SkuID = stock.SkuID
                        INNER JOIN Inventory.Items AS item
                            ON item.TenantID = sku.TenantID
                            AND item.ItemID = sku.ItemID
                        ${whereClause}
                        ORDER BY
                            item.Name ASC,
                            sku.SkuCode ASC,
                            warehouse.Name ASC,
                            stock.StockStatus ASC,
                            stock.InventoryStockID ASC
                        OFFSET ${filters.offset} ROWS
                        FETCH NEXT ${filters.pageSize} ROWS ONLY
                    `
                )

                const summary = normalizeInventoryListSummary(
                    summaryRows[0]
                )

                return NextResponse.json({
                    data: rows.map(normalizeInventoryStockRow),
                    summary,
                    pagination: {
                        page: filters.page,
                        pageSize: filters.pageSize,
                        total: summary.totalRows,
                        totalPages:
                            summary.totalRows === 0
                                ? 0
                                : Math.ceil(
                                    summary.totalRows /
                                    filters.pageSize
                                )
                    }
                })
            })
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : 'UNKNOWN_ERROR'

            console.error('[INVENTORY_LIST_ERROR]', {
                tenantId,
                message
            })

            return NextResponse.json(
                {
                    message:
                        'No fue posible consultar el inventario.'
                },
                {
                    status: 500
                }
            )
        }
    },
    {
        bit: PERM.R
    }
)
