import { Prisma } from '@prisma/client'

import type {
    InventoryItemMaintenance,
    InventoryItemRow,
    InventoryItemStateRow,
    InventorySkuMaintenance,
    InventorySkuRow
} from '@/types/inventory-maintenance'

const normalizeDateTime = (
    value: Date | string
): string => {
    const date =
        value instanceof Date
            ? value
            : new Date(value)

    return Number.isNaN(date.getTime())
        ? ''
        : date.toISOString()
}

const normalizeDecimal = (
    value:
        | Prisma.Decimal
        | number
        | string
        | null
): number => {
    if (value === null) {
        return 0
    }

    const parsed = Number(
        typeof value === 'object'
            ? value.toString()
            : value
    )

    return Number.isFinite(parsed)
        ? parsed
        : 0
}

export const normalizeInventoryItemFromRow = (
    row: InventoryItemRow
): InventoryItemMaintenance => ({
    itemId: Number(row.ItemID),
    tenantId: String(row.TenantID),
    name: row.Name,
    description: row.Description,
    category: row.Category,
    manufacturer: row.Manufacturer,
    isActive: Boolean(row.IsActive),
    skuCount: Number(row.SkuCount ?? 0),
    activeSkuCount: Number(
        row.ActiveSkuCount ?? 0
    ),
    createdAt: normalizeDateTime(row.CreatedAt),
    updatedAt: normalizeDateTime(row.UpdatedAt),
    createdBy: row.CreatedBy,
    updatedBy: row.UpdatedBy
})

export const normalizeInventorySkuFromRow = (
    row: InventorySkuRow
): InventorySkuMaintenance => ({
    skuId: Number(row.SkuID),
    tenantId: String(row.TenantID),
    itemId: Number(row.ItemID),
    itemName: row.ItemName,
    skuCode: row.SkuCode,
    manufacturerPartNumber:
        row.ManufacturerPartNumber,
    unitOfMeasure: row.UnitOfMeasure,
    isSerialized: Boolean(row.IsSerialized),
    isLotTracked: Boolean(row.IsLotTracked),
    isPalletTracked: Boolean(
        row.IsPalletTracked
    ),
    allowsReverseLogistics: Boolean(
        row.AllowsReverseLogistics
    ),
    isActive: Boolean(row.IsActive),
    stockRecordCount: Number(
        row.StockRecordCount ?? 0
    ),
    onHandQuantity: normalizeDecimal(
        row.OnHandQuantity
    ),
    reservedQuantity: normalizeDecimal(
        row.ReservedQuantity
    ),
    availableQuantity: normalizeDecimal(
        row.AvailableQuantity
    ),
    createdAt: normalizeDateTime(row.CreatedAt),
    updatedAt: normalizeDateTime(row.UpdatedAt),
    createdBy: row.CreatedBy,
    updatedBy: row.UpdatedBy
})

export const getInventoryItemById = async (
    tx: Prisma.TransactionClient,
    tenantId: string,
    itemId: number
): Promise<InventoryItemMaintenance | null> => {
    const rows =
        await tx.$queryRaw<InventoryItemRow[]>(
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
                        COUNT_BIG(1) AS SkuCount,
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
                WHERE i.TenantID =
                    CAST(
                        ${tenantId}
                        AS uniqueidentifier
                    )
                  AND i.ItemID = ${itemId}
            `
        )

    return rows[0]
        ? normalizeInventoryItemFromRow(rows[0])
        : null
}

export const getInventoryItemStateById =
    async (
        tx: Prisma.TransactionClient,
        tenantId: string,
        itemId: number
    ): Promise<InventoryItemStateRow | null> => {
        const rows =
            await tx.$queryRaw<
                InventoryItemStateRow[]
            >(
                Prisma.sql`
                    SELECT
                        ItemID,
                        Name,
                        IsActive
                    FROM Inventory.Items
                    WHERE TenantID =
                        CAST(
                            ${tenantId}
                            AS uniqueidentifier
                        )
                      AND ItemID = ${itemId}
                `
            )

        return rows[0] ?? null
    }

export const getInventorySkuById = async (
    tx: Prisma.TransactionClient,
    tenantId: string,
    skuId: number
): Promise<InventorySkuMaintenance | null> => {
    const rows =
        await tx.$queryRaw<InventorySkuRow[]>(
            Prisma.sql`
                SELECT
                    sku.SkuID,
                    sku.TenantID,
                    sku.ItemID,
                    item.Name AS ItemName,
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
                        SUM(s.OnHandQuantity)
                            AS OnHandQuantity,
                        SUM(s.ReservedQuantity)
                            AS ReservedQuantity,
                        SUM(s.AvailableQuantity)
                            AS AvailableQuantity
                    FROM Inventory.InventoryStock s
                    WHERE s.TenantID =
                        sku.TenantID
                      AND s.SkuID =
                        sku.SkuID
                ) stock
                WHERE sku.TenantID =
                    CAST(
                        ${tenantId}
                        AS uniqueidentifier
                    )
                  AND sku.SkuID = ${skuId}
            `
        )

    return rows[0]
        ? normalizeInventorySkuFromRow(rows[0])
        : null
}
