'use client'

import { useState } from 'react'

import Box from '@mui/material/Box'
import _Grid from '@mui/material/Grid2'

import WarehouseMapStats from './WarehouseMapStats'
import WarehouseMapView from './WarehouseMapView'
import CapacitySidebar from './CapacitySidebar'
import CapacityHistoryModal from './CapacityHistoryModal'
import { useWarehouseMap } from './useWarehouseMap'
import type { MapFilterType } from '@/types/warehouse-map'

type Props = {
  mapboxToken: string
  t: (key: string) => string
}

const WarehouseMapPage = ({ mapboxToken, t }: Props) => {
  const { warehouses, statistics, capacities, isLoadingMap, isLoadingCapacities, errorMap: _errorMap } = useWarehouseMap()
  const [filterType, setFilterType] = useState<MapFilterType>('all')
  const [historyOpen, setHistoryOpen] = useState(false)
  const [selectedWarehouse, setSelectedWarehouse] = useState('')

  const handleWarehouseClick = (nombre: string) => {
    setSelectedWarehouse(nombre)
    setHistoryOpen(true)
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 140px)' }}>
      <Box sx={{ p: 2 }}>
        <WarehouseMapStats
          statistics={statistics}
          isLoading={isLoadingMap}
          t={t}
        />
      </Box>

      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden', px: 2, pb: 2, gap: 2, minHeight: 0 }}>
        <Box sx={{ flex: 1, borderRadius: 2, overflow: 'hidden', bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', position: 'relative' }}>
          <WarehouseMapView
            warehouses={warehouses}
            filterType={filterType}
            onFilterChange={setFilterType}
            mapboxToken={mapboxToken}
            t={t}
            onWarehouseClick={handleWarehouseClick}
          />
        </Box>

        <CapacitySidebar
          capacities={capacities}
          isLoading={isLoadingCapacities}
          onWarehouseClick={handleWarehouseClick}
          t={t}
        />
      </Box>

      <CapacityHistoryModal
        open={historyOpen}
        warehouseName={selectedWarehouse}
        onClose={() => setHistoryOpen(false)}
        t={t}
      />
    </Box>
  )
}

export default WarehouseMapPage
