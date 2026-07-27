import type {
    InventoryListFilters,
    InventoryListSummary,
    InventoryListSummaryRow,
    InventoryStockListItem,
    InventoryStockRow
} from '@/types/inventory'

const DEFAULT_PAGE_SIZE = 25
const MAX_PAGE_SIZE = 100
const MAX_SEARCH_LENGTH = 200
const MAX_STATUS_LENGTH = 40
const MAX_CATEGORY_LENGTH = 120

export class InventoryQueryValidationError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'InventoryQueryValidationError'
    }
}

const normalizeOptionalText = (
    value: string | null,
    maxLength: number,
    fieldName: string
): string | null => {
    if (value === null) {
        return null
    }

    const normalized = value.trim()

    if (!normalized) {
        return null
    }

    if (normalized.length > maxLength) {
        throw new InventoryQueryValidationError(
            `${fieldName} no puede exceder ${maxLength} caracteres.`
        )
    }

    return normalized
}

const parsePositiveInteger = (
    value: string | null,
    fieldName: string
): number | null => {
    if (value === null || value.trim() === '') {
        return null
    }

    const parsedValue = Number(value)

    if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
        throw new InventoryQueryValidationError(
            `${fieldName} debe ser un entero mayor a cero.`
        )
    }

    return parsedValue
}

const parseBoolean = (
    value: string | null,
    fieldName: string
): boolean | null => {
    if (value === null || value.trim() === '') {
        return null
    }

    if (value === 'true') {
        return true
    }

    if (value === 'false') {
        return false
    }

    throw new InventoryQueryValidationError(
        `${fieldName} debe ser true o false.`
    )
}

const escapeSqlLikeValue = (value: string): string => {
    return value.replace(/[|%_[]/g, character => `|${character}`)
}

const toQuantity = (
    value: InventoryStockRow['OnHandQuantity'] | null | undefined
): number => {
    if (value === null || value === undefined) {
        return 0
    }

    const parsedValue = Number(value)

    return Number.isFinite(parsedValue) ? parsedValue : 0
}

export const parseInventoryListFilters = (
    searchParams: URLSearchParams
): InventoryListFilters => {
    const rawSearch = normalizeOptionalText(
        searchParams.get('search'),
        MAX_SEARCH_LENGTH,
        'search'
    )

    const stockStatus = normalizeOptionalText(
        searchParams.get('stockStatus'),
        MAX_STATUS_LENGTH,
        'stockStatus'
    )

    const category = normalizeOptionalText(
        searchParams.get('category'),
        MAX_CATEGORY_LENGTH,
        'category'
    )

    const warehouseId = parsePositiveInteger(
        searchParams.get('warehouseId'),
        'warehouseId'
    )

    const active = parseBoolean(
        searchParams.get('active'),
        'active'
    )

    const requestedPage = parsePositiveInteger(
        searchParams.get('page'),
        'page'
    )

    const requestedPageSize = parsePositiveInteger(
        searchParams.get('pageSize'),
        'pageSize'
    )

    const page = requestedPage ?? 1

    const pageSize = Math.min(
        requestedPageSize ?? DEFAULT_PAGE_SIZE,
        MAX_PAGE_SIZE
    )

    return {
        searchPattern: rawSearch
            ? `%${escapeSqlLikeValue(rawSearch)}%`
            : null,
        warehouseId,
        stockStatus: stockStatus?.toUpperCase() ?? null,
        category,
        active,
        page,
        pageSize,
        offset: (page - 1) * pageSize
    }
}

export const normalizeInventoryStockRow = (
    row: InventoryStockRow
): InventoryStockListItem => {
    return {
        inventoryStockId: String(row.InventoryStockID),
        warehouse: {
            id: row.WarehouseID,
            code: row.WarehouseCode,
            name: row.WarehouseName,
            region: row.WarehouseRegion,
            isActive: Boolean(row.WarehouseIsActive)
        },
        item: {
            id: row.ItemID,
            name: row.ItemName,
            description: row.ItemDescription,
            category: row.Category,
            manufacturer: row.Manufacturer,
            isActive: Boolean(row.ItemIsActive)
        },
        sku: {
            id: row.SkuID,
            code: row.SkuCode,
            manufacturerPartNumber: row.ManufacturerPartNumber,
            unitOfMeasure: row.UnitOfMeasure,
            tracking: {
                isSerialized: Boolean(row.IsSerialized),
                isLotTracked: Boolean(row.IsLotTracked),
                isPalletTracked: Boolean(row.IsPalletTracked),
                allowsReverseLogistics: Boolean(
                    row.AllowsReverseLogistics
                )
            },
            isActive: Boolean(row.SkuIsActive)
        },
        stock: {
            status: row.StockStatus,
            onHand: toQuantity(row.OnHandQuantity),
            reserved: toQuantity(row.ReservedQuantity),
            available: toQuantity(row.AvailableQuantity),
            updatedAt: row.UpdatedAt.toISOString()
        }
    }
}

export const normalizeInventoryListSummary = (
    row: InventoryListSummaryRow | undefined
): InventoryListSummary => {
    if (!row) {
        return {
            totalRows: 0,
            totalSkus: 0,
            onHand: 0,
            reserved: 0,
            available: 0
        }
    }

    return {
        totalRows: Number(row.TotalRows ?? 0),
        totalSkus: Number(row.TotalSkus ?? 0),
        onHand: toQuantity(row.OnHandQuantity),
        reserved: toQuantity(row.ReservedQuantity),
        available: toQuantity(row.AvailableQuantity)
    }
}
