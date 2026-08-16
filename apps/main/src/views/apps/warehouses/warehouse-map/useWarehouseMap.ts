'use client'

import { useState, useEffect } from 'react'

import type {
  WarehouseMapItem,
  MapStatistics,
  WarehouseCapacity,
  MapApiResponse,
  CapacityApiResponse
} from '@/types/warehouse-map'

type UseWarehouseMapReturn = {
  warehouses: WarehouseMapItem[]
  statistics: MapStatistics | null
  capacities: WarehouseCapacity[]
  isLoadingMap: boolean
  isLoadingCapacities: boolean
  errorMap: string | null
  errorCapacities: string | null
  refetch: () => void
}

export function useWarehouseMap(): UseWarehouseMapReturn {
  const [warehouses, setWarehouses] = useState<WarehouseMapItem[]>([])
  const [statistics, setStatistics] = useState<MapStatistics | null>(null)
  const [capacities, setCapacities] = useState<WarehouseCapacity[]>([])
  const [isLoadingMap, setIsLoadingMap] = useState(true)
  const [isLoadingCapacities, setIsLoadingCapacities] = useState(true)
  const [errorMap, setErrorMap] = useState<string | null>(null)
  const [errorCapacities, setErrorCapacities] = useState<string | null>(null)

  const fetchMapData = async () => {
    setIsLoadingMap(true)
    setErrorMap(null)
    try {
      const res = await fetch('/api/warehouses/map')
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Failed to fetch map data' }))
        throw new Error(err.message || `HTTP ${res.status}`)
      }
      const json: MapApiResponse = await res.json()
      if (!json.ok) throw new Error('API returned not ok')
      setWarehouses(json.data.warehouses)
      setStatistics(json.data.statistics)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setErrorMap(msg)
    } finally {
      setIsLoadingMap(false)
    }
  }

  const fetchCapacities = async () => {
    setIsLoadingCapacities(true)
    setErrorCapacities(null)
    try {
      const res = await fetch('/api/warehouses/map/capacity')
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Failed to fetch capacities' }))
        throw new Error(err.message || `HTTP ${res.status}`)
      }
      const json: CapacityApiResponse = await res.json()
      if (!json.ok) throw new Error('API returned not ok')
      setCapacities(json.data)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setErrorCapacities(msg)
    } finally {
      setIsLoadingCapacities(false)
    }
  }

  useEffect(() => {
    fetchMapData()
    fetchCapacities()
  }, [])

  const refetch = () => {
    fetchMapData()
    fetchCapacities()
  }

  return {
    warehouses,
    statistics,
    capacities,
    isLoadingMap,
    isLoadingCapacities,
    errorMap,
    errorCapacities,
    refetch
  }
}
