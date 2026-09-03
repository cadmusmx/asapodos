import type { Prisma } from '@prisma/client'

export type InventoryCatalogOption = {
  value: string
  label: string
}

export type InventoryWarehouseCatalogItem = {
  id: number
  code: string
  name: string
  region: string | null
  isActive: boolean
}

export type InventoryStockStatusCatalogItem = InventoryCatalogOption & {
  recordCount: number
  onHand: number
  reserved: number
  available: number
}

export type InventoryCatalogsData = {
  warehouses: InventoryWarehouseCatalogItem[]
  categories: InventoryCatalogOption[]
  stockStatuses: InventoryStockStatusCatalogItem[]
  unitsOfMeasure: InventoryCatalogOption[]
}

export type InventoryCatalogsResponse = {
  data: InventoryCatalogsData
}

/**
 * Tipos internos que representan directamente las filas
 * devueltas por SQL Server.
 */
export type InventoryWarehouseCatalogRow = {
  WarehouseID: number
  Code: string
  Name: string
  Region: string | null
  IsActive: boolean
}

export type InventoryCatalogOptionRow = {
  Value: string
}

export type InventoryStockStatusCatalogRow = {
  StockStatus: string
  RecordCount: bigint
  OnHandQuantity: Prisma.Decimal | number | null
  ReservedQuantity: Prisma.Decimal | number | null
  AvailableQuantity: Prisma.Decimal | number | null
}
