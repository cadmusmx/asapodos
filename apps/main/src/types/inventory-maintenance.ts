import type { Prisma } from '@prisma/client'

export type InventoryItemMaintenance = {
  itemId: number
  tenantId: string
  name: string
  description: string | null
  category: string | null
  manufacturer: string | null
  isActive: boolean
  skuCount: number
  activeSkuCount: number
  createdAt: string
  updatedAt: string
  createdBy: number | null
  updatedBy: number | null
}

export type InventoryItemPayload = {
  name: string
  description: string | null
  category: string | null
  manufacturer: string | null
  isActive: boolean
}

export type InventoryItemListResponse = {
  data: InventoryItemMaintenance[]
  total: number
  page: number
  pageSize: number
}

export type InventoryItemRow = {
  ItemID: number
  TenantID: string
  Name: string
  Description: string | null
  Category: string | null
  Manufacturer: string | null
  IsActive: boolean | number
  SkuCount: bigint | number
  ActiveSkuCount: bigint | number
  CreatedAt: Date | string
  UpdatedAt: Date | string
  CreatedBy: number | null
  UpdatedBy: number | null
}

export type InventoryItemStateRow = {
  ItemID: number
  Name: string
  IsActive: boolean | number
}

export type InventorySkuMaintenance = {
  skuId: number
  tenantId: string
  itemId: number
  itemName: string
  skuCode: string
  manufacturerPartNumber: string | null
  unitOfMeasure: string
  isSerialized: boolean
  isLotTracked: boolean
  isPalletTracked: boolean
  allowsReverseLogistics: boolean
  isActive: boolean
  stockRecordCount: number
  onHandQuantity: number
  reservedQuantity: number
  availableQuantity: number
  createdAt: string
  updatedAt: string
  createdBy: number | null
  updatedBy: number | null
}

export type InventorySkuPayload = {
  itemId: number
  skuCode: string
  manufacturerPartNumber: string | null
  unitOfMeasure: string
  isSerialized: boolean
  isLotTracked: boolean
  isPalletTracked: boolean
  allowsReverseLogistics: boolean
  isActive: boolean
}

type InventoryDecimalValue = Prisma.Decimal | number | string | null

export type InventorySkuRow = {
  SkuID: number
  TenantID: string
  ItemID: number
  ItemName: string
  SkuCode: string
  ManufacturerPartNumber: string | null
  UnitOfMeasure: string
  IsSerialized: boolean | number
  IsLotTracked: boolean | number
  IsPalletTracked: boolean | number
  AllowsReverseLogistics: boolean | number
  IsActive: boolean | number
  StockRecordCount: bigint | number
  OnHandQuantity: InventoryDecimalValue
  ReservedQuantity: InventoryDecimalValue
  AvailableQuantity: InventoryDecimalValue
  CreatedAt: Date | string
  UpdatedAt: Date | string
  CreatedBy: number | null
  UpdatedBy: number | null
}

export type InventoryMaintenanceListFilters = {
  searchPattern: string | null
  active: boolean | null
  page: number
  pageSize: number
  offset: number
}

export type InventorySkuListFilters = InventoryMaintenanceListFilters & {
  itemId: number | null
}
