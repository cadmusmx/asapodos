import type { Prisma } from '@prisma/client'

export type InventoryTracking = {
  isSerialized: boolean
  isLotTracked: boolean
  isPalletTracked: boolean
  allowsReverseLogistics: boolean
}

export type InventoryWarehouseSummary = {
  id: number
  code: string
  name: string
  region: string | null
  isActive: boolean
}

export type InventoryItemSummary = {
  id: number
  name: string
  description: string | null
  category: string | null
  manufacturer: string | null
  isActive: boolean
}

export type InventorySkuSummary = {
  id: number
  code: string
  manufacturerPartNumber: string | null
  unitOfMeasure: string
  tracking: InventoryTracking
  isActive: boolean
}

export type InventoryQuantitySummary = {
  status: string
  onHand: number
  reserved: number
  available: number
  updatedAt: string
}

export type InventoryStockListItem = {
  inventoryStockId: string
  warehouse: InventoryWarehouseSummary
  item: InventoryItemSummary
  sku: InventorySkuSummary
  stock: InventoryQuantitySummary
}

export type InventoryListSummary = {
  totalRows: number
  totalSkus: number
  onHand: number
  reserved: number
  available: number
}

export type InventoryPagination = {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export type InventoryListResponse = {
  data: InventoryStockListItem[]
  summary: InventoryListSummary
  pagination: InventoryPagination
}

export type InventoryListFilters = {
  searchPattern: string | null
  warehouseId: number | null
  stockStatus: string | null
  category: string | null
  active: boolean | null
  page: number
  pageSize: number
  offset: number
}

/**
 * Representación directa de una fila obtenida desde SQL Server.
 */
export type InventoryStockRow = {
  InventoryStockID: bigint
  WarehouseID: number
  WarehouseCode: string
  WarehouseName: string
  WarehouseRegion: string | null
  WarehouseIsActive: boolean

  ItemID: number
  ItemName: string
  ItemDescription: string | null
  Category: string | null
  Manufacturer: string | null
  ItemIsActive: boolean

  SkuID: number
  SkuCode: string
  ManufacturerPartNumber: string | null
  UnitOfMeasure: string
  IsSerialized: boolean
  IsLotTracked: boolean
  IsPalletTracked: boolean
  AllowsReverseLogistics: boolean
  SkuIsActive: boolean

  StockStatus: string
  OnHandQuantity: Prisma.Decimal | number
  ReservedQuantity: Prisma.Decimal | number
  AvailableQuantity: Prisma.Decimal | number
  UpdatedAt: Date
}

export type InventoryListSummaryRow = {
  TotalRows: bigint
  TotalSkus: number
  OnHandQuantity: Prisma.Decimal | number | null
  ReservedQuantity: Prisma.Decimal | number | null
  AvailableQuantity: Prisma.Decimal | number | null
}
