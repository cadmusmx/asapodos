import type {
  InventoryCatalogOption,
  InventoryCatalogOptionRow,
  InventoryStockStatusCatalogItem,
  InventoryStockStatusCatalogRow,
  InventoryWarehouseCatalogItem,
  InventoryWarehouseCatalogRow
} from '@/types/inventory-catalogs'

const toQuantity = (value: InventoryStockStatusCatalogRow['OnHandQuantity'] | null | undefined): number => {
  if (value === null || value === undefined) {
    return 0
  }

  const parsedValue = Number(value)

  return Number.isFinite(parsedValue) ? parsedValue : 0
}

export const normalizeInventoryWarehouseCatalogRow = (
  row: InventoryWarehouseCatalogRow
): InventoryWarehouseCatalogItem => {
  return {
    id: row.WarehouseID,
    code: row.Code,
    name: row.Name,
    region: row.Region,
    isActive: Boolean(row.IsActive)
  }
}

export const normalizeInventoryCatalogOptionRow = (row: InventoryCatalogOptionRow): InventoryCatalogOption => {
  const value = row.Value.trim()

  return {
    value,
    label: value
  }
}

export const normalizeInventoryStockStatusCatalogRow = (
  row: InventoryStockStatusCatalogRow
): InventoryStockStatusCatalogItem => {
  const value = row.StockStatus.trim()

  return {
    value,
    label: value,
    recordCount: Number(row.RecordCount),
    onHand: toQuantity(row.OnHandQuantity),
    reserved: toQuantity(row.ReservedQuantity),
    available: toQuantity(row.AvailableQuantity)
  }
}
