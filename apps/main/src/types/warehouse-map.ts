export type WarehouseMapItem = {
  Id: number
  Almacen: string
  Latitud: number | null
  Longitud: number | null
  Direccion: string | null
  Capacidad_Ocupada: number | null
  Region: string
  Ciudad: string
  Capacidad: number | null
  Estado_Almacen: string | null
}

export type MapStatistics = {
  total: number
  operativos: number
  capacidadTotal: number
  capacidadOcupada: number
}

export type WarehouseCapacity = {
  Almacen: string
  Capacidad: number | null
  Capacidad_Ocupada: number | null
}

export type CapacityHistoryItem = {
  fecha_actualizacion: string
  capacidad_ocupada: number
}

export type MapFilterType = 'all' | 'gaso' | 'ericsson'

export type HistoryPreset = 'last4' | '7d' | 'thisMonth' | 'lastMonth' | '90d'
export type HistoryGroup = 'raw' | 'day' | 'week' | 'month'

export type MapApiResponse = {
  ok: boolean
  data: {
    warehouses: WarehouseMapItem[]
    statistics: MapStatistics
  }
}

export type CapacityApiResponse = {
  ok: boolean
  data: WarehouseCapacity[]
}

export type CapacityHistoryApiResponse = {
  ok: boolean
  capacidadTotal: number
  data: CapacityHistoryItem[]
}
