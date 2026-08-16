'use client'

/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable padding-line-between-statements */
/* eslint-disable newline-before-return */
/* eslint-disable import/order */

import { useEffect, useState } from 'react'
import Grid from '@mui/material/Grid2'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import IconButton from '@mui/material/IconButton'

import WarehouseCounterCards from '@views/dashboards/warehouses/WarehouseCounterCards'
import WarehouseFilters from '@views/dashboards/warehouses/WarehouseFilters'
import KpiCard from '@views/dashboards/components/KpiCard'
import ChartModal from '@views/dashboards/components/ChartModal'
import DashboardLoading from '@views/dashboards/components/DashboardLoading'
import DashboardError from '@views/dashboards/components/DashboardError'
import OccupancyChart from '@views/dashboards/warehouses/OccupancyChart'
import StatusChart from '@views/dashboards/warehouses/StatusChart'
import CapacityVsOccupiedChart from '@views/dashboards/warehouses/CapacityVsOccupiedChart'
import OccupancyLevelsChart from '@views/dashboards/warehouses/OccupancyLevelsChart'
import WarehouseCards from '@views/dashboards/warehouses/WarehouseCards'
import WarehouseTable from '@views/dashboards/warehouses/WarehouseTable'

type WarehouseItem = {
  id: number
  almacen: string
  region: string
  ciudad: string
  capacidad: number
  estadoAlmacen: string
  responsable: string
  coordinador: string
  capacidadOcupada: number
}

type DashboardData = {
  counters: {
    totalAlmacenes: number
    operativos: number
    capacidadTotal: number
    espacioOcupado: number
    espacioDisponible: number
    ocupacionPorcentaje: number
  }
  warehouseItems: WarehouseItem[]
  occupancyLevels: Array<{ level: string; count: number }>
  capacidadVsOcupado: Array<{ almacen: string; capacidad: number; ocupado: number }>
  estadosCount: { operativos: number; inoperativos: number }
  regions: string[]
  cities: string[]
}

type CatalogData = {
  regions: Array<{ id: number; nombre: string }>
  warehouses: Array<{ id: number; nombre: string }>
}

type Props = {
  dictionary: Record<string, any>
}

const WarehousesDashboard = ({ dictionary }: Props) => {
  const [data, setData] = useState<DashboardData | null>(null)
  const [catalogs, setCatalogs] = useState<CatalogData>({ regions: [], warehouses: [] })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchKey, setSearchKey] = useState(0)
  const [modalCapacityOpen, setModalCapacityOpen] = useState(false)
  const [filters, setFilters] = useState({
    region: '',
    ciudad: '',
    estado: '',
    nivelOcupacion: ''
  })

  const t = (key: string) => {
    return key.split('.').reduce((obj, k) => obj?.[k], dictionary) as unknown as string ?? key
  }

  const fetchData = async () => {
    try {
      if (data !== null) setRefreshing(true)
      setLoading(true)
      const params = new URLSearchParams()
      if (filters.region) params.set('region', filters.region)
      if (filters.ciudad) params.set('ciudad', filters.ciudad)
      if (filters.estado) params.set('estado', filters.estado)
      if (filters.nivelOcupacion) params.set('nivelOcupacion', filters.nivelOcupacion)
      const url = params.toString() ? `/api/warehouses/dashboard?${params.toString()}` : '/api/warehouses/dashboard'
      const response = await fetch(url)
      if (!response.ok) throw new Error('Failed to fetch dashboard data')
      const result = await response.json()
      setData(result.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const fetchCatalogs = async () => {
    try {
      const [regionsRes, warehousesRes] = await Promise.all([
        fetch('/api/catalogs?type=regions'),
        fetch('/api/catalogs?type=warehouses')
      ])
      const [regions, warehouses] = await Promise.all([
        regionsRes.json(),
        warehousesRes.json()
      ])
      setCatalogs({
        regions: regions.data || [],
        warehouses: warehouses.data || []
      })
    } catch (err) {
      console.error('Failed to fetch catalogs:', err)
    }
  }

  useEffect(() => {
    fetchCatalogs()
    fetchData()
  }, [searchKey])

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }))
  }

  const handleSearch = () => {
    setRefreshing(false)
    setSearchKey(prev => prev + 1)
  }

  const handleReload = () => {
    setRefreshing(false)
    setSearchKey(prev => prev + 1)
  }

  const handleClear = () => {
    setSearchKey(prev => prev + 1)
  }

  if (loading) {
    return <DashboardLoading />
  }

  if (error || !data) {
    return <DashboardError message={error || 'No data available'} />
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <WarehouseCounterCards t={t} counters={data.counters} />
      </Grid>
      <Grid size={{ xs: 12 }}>
        <WarehouseFilters
          t={t}
          values={filters}
          onChange={handleFilterChange}
          onSearch={handleSearch}
          onClear={handleClear}
          onReload={handleReload}
          regions={catalogs.regions.map(r => r.nombre)}
          cities={data.cities}
        />
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <KpiCard
          title={t('dashboard.warehouses.generalOccupancy')}
          borderColor='#0d6efd'
          iconBackground='rgba(13,110,253,.12)'
          iconColor='#0d6efd'
          iconClass='ri-pie-chart-2-line'
          loading={refreshing}
        >
          <OccupancyChart
            t={t}
            counters={data.counters}
            occupancyPercentage={data.counters.ocupacionPorcentaje}
          />
        </KpiCard>
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <KpiCard
          title={t('dashboard.warehouses.generalStatus')}
          borderColor='#28a745'
          iconBackground='rgba(40,167,69,.12)'
          iconColor='#28a745'
          iconClass='ri-checkbox-circle-line'
          loading={refreshing}
        >
          <StatusChart t={t} data={data.estadosCount} />
        </KpiCard>
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <KpiCard
          title={t('dashboard.warehouses.capacityVsOccupied')}
          borderColor='#17a2b8'
          iconBackground='rgba(23,162,184,.12)'
          iconColor='#17a2b8'
          iconClass='ri-bar-chart-box-line'
          loading={refreshing}
          action={
              <IconButton size='small' onClick={() => setModalCapacityOpen(true)} sx={{ color: 'var(--mui-palette-text-secondary)' }}>
              <i className='ri-eye-line' style={{ fontSize: '1.1rem' }} />
            </IconButton>
          }
        >
          <CapacityVsOccupiedChart t={t} data={data.capacidadVsOcupado} height={380} />
        </KpiCard>
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <KpiCard
          title={t('dashboard.warehouses.occupancyLevels')}
          borderColor='#ffc107'
          iconBackground='rgba(255,193,7,.12)'
          iconColor='#ffc107'
          iconClass='ri-line-chart-line'
          loading={refreshing}
        >
          <OccupancyLevelsChart t={t} data={data.occupancyLevels} />
        </KpiCard>
      </Grid>
      <Grid size={{ xs: 12 }}>
        <KpiCard
          title={t('dashboard.warehouses.warehouseSummary')}
          borderColor='#6f42c1'
          iconBackground='rgba(111,66,193,.12)'
          iconColor='#6f42c1'
          iconClass='ri-warehouse-line'
          loading={refreshing}
        >
          <WarehouseCards t={t} data={data.warehouseItems} />
        </KpiCard>
      </Grid>
      <Grid size={{ xs: 12 }}>
        <WarehouseTable t={t} data={data.warehouseItems} />
      </Grid>

      <ChartModal
        open={modalCapacityOpen}
        onClose={() => setModalCapacityOpen(false)}
        title={t('dashboard.warehouses.capacityVsOccupied')}
        t={t}
      >
        <CapacityVsOccupiedChart t={t} data={data.capacidadVsOcupado} height={450} />
      </ChartModal>
    </Grid>
  )
}

export default WarehousesDashboard
