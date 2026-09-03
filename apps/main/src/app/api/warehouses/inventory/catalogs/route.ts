import { NextResponse } from 'next/server'

import { Prisma } from '@prisma/client'

import { PERM, withPermission } from '@gaso/shared'

import {
  normalizeInventoryCatalogOptionRow,
  normalizeInventoryStockStatusCatalogRow,
  normalizeInventoryWarehouseCatalogRow
} from '@/lib/inventory/catalogs'
import { withTenantContext } from '@/lib/tenant-context'

import type {
  InventoryCatalogOptionRow,
  InventoryCatalogsResponse,
  InventoryStockStatusCatalogRow,
  InventoryWarehouseCatalogRow
} from '@/types/inventory-catalogs'

export const runtime = 'nodejs'

export const GET = withPermission(
  'inventory',
  async (_req, { tenantId }) => {
    try {
      const data = await withTenantContext(tenantId, async tx => {
        const warehouseRows = await tx.$queryRaw<InventoryWarehouseCatalogRow[]>(
          Prisma.sql`
                                SELECT
                                    warehouse.WarehouseID,
                                    warehouse.Code,
                                    warehouse.Name,
                                    warehouse.Region,
                                    warehouse.IsActive
                                FROM Warehouses.Warehouses AS warehouse
                                WHERE warehouse.TenantID =
                                    CAST(
                                        ${tenantId}
                                        AS uniqueidentifier
                                    )
                                ORDER BY
                                    warehouse.IsActive DESC,
                                    warehouse.Name ASC,
                                    warehouse.WarehouseID ASC
                            `
        )

        /*
         *  que no se me olvide que las categorías se obtienen únicamente de artículos
         * que actualmente tienen alguna existencia registrada.
         */
        const categoryRows = await tx.$queryRaw<InventoryCatalogOptionRow[]>(
          Prisma.sql`
                                SELECT DISTINCT
                                    LTRIM(RTRIM(item.Category)) AS Value
                                FROM Inventory.Items AS item
                                INNER JOIN Inventory.SKUs AS sku
                                    ON sku.TenantID = item.TenantID
                                    AND sku.ItemID = item.ItemID
                                INNER JOIN
                                    Inventory.InventoryStock AS stock
                                    ON stock.TenantID = sku.TenantID
                                    AND stock.SkuID = sku.SkuID
                                WHERE item.TenantID =
                                    CAST(
                                        ${tenantId}
                                        AS uniqueidentifier
                                    )
                                  AND item.Category IS NOT NULL
                                  AND LEN(
                                      LTRIM(RTRIM(item.Category))
                                  ) > 0
                                ORDER BY Value ASC
                            `
        )

        const stockStatusRows = await tx.$queryRaw<InventoryStockStatusCatalogRow[]>(
          Prisma.sql`
                                SELECT
                                    stock.StockStatus,
                                    COUNT_BIG(1) AS RecordCount,
                                    SUM(stock.OnHandQuantity)
                                        AS OnHandQuantity,
                                    SUM(stock.ReservedQuantity)
                                        AS ReservedQuantity,
                                    SUM(stock.AvailableQuantity)
                                        AS AvailableQuantity
                                FROM Inventory.InventoryStock AS stock
                                WHERE stock.TenantID =
                                    CAST(
                                        ${tenantId}
                                        AS uniqueidentifier
                                    )
                                GROUP BY stock.StockStatus
                                ORDER BY stock.StockStatus ASC
                            `
        )

        const unitOfMeasureRows = await tx.$queryRaw<InventoryCatalogOptionRow[]>(
          Prisma.sql`
                                SELECT DISTINCT
                                    LTRIM(
                                        RTRIM(sku.UnitOfMeasure)
                                    ) AS Value
                                FROM Inventory.SKUs AS sku
                                INNER JOIN
                                    Inventory.InventoryStock AS stock
                                    ON stock.TenantID = sku.TenantID
                                    AND stock.SkuID = sku.SkuID
                                WHERE sku.TenantID =
                                    CAST(
                                        ${tenantId}
                                        AS uniqueidentifier
                                    )
                                  AND LEN(
                                      LTRIM(
                                          RTRIM(
                                              sku.UnitOfMeasure
                                          )
                                      )
                                  ) > 0
                                ORDER BY Value ASC
                            `
        )

        return {
          warehouses: warehouseRows.map(normalizeInventoryWarehouseCatalogRow),
          categories: categoryRows.map(normalizeInventoryCatalogOptionRow),
          stockStatuses: stockStatusRows.map(normalizeInventoryStockStatusCatalogRow),
          unitsOfMeasure: unitOfMeasureRows.map(normalizeInventoryCatalogOptionRow)
        }
      })

      const response: InventoryCatalogsResponse = {
        data
      }

      return NextResponse.json(response)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR'

      console.error('[INVENTORY_CATALOGS_ERROR]', {
        tenantId,
        message
      })

      return NextResponse.json(
        {
          message: 'No fue posible consultar los catálogos del inventario.'
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
