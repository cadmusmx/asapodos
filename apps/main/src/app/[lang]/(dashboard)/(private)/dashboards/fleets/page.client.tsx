'use client'

/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable padding-line-between-statements */
/* eslint-disable newline-before-return */
/* eslint-disable import/order */

import { useEffect, useState } from 'react'
import Grid from '@mui/material/Grid2'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'
import IconButton from '@mui/material/IconButton'

import FleetCounterCards from '@views/dashboards/fleets/FleetCounterCards'
import FleetFilters from '@views/dashboards/fleets/FleetFilters'
import KpiCard from '@views/dashboards/components/KpiCard'
import ChartModal from '@views/dashboards/components/ChartModal'
import RequestsByMonthChart from '@views/dashboards/fleets/RequestsByMonthChart'
import ByVehicleChart from '@views/dashboards/fleets/ByVehicleChart'
import ByRegionChart from '@views/dashboards/fleets/ByRegionChart'
import MileageChart from '@views/dashboards/fleets/MileageChart'
import FuelConsumptionChart from '@views/dashboards/fleets/FuelConsumptionChart'

type MonthlyData = { month: string; year: string; count: number; monto: number }

type DashboardData = {
  counters: {
    total: number
    active: number
    inactive: number
    totalKms: number
    totalFuel: number
  }
  monthlyKm: MonthlyData[]
  fuelData: MonthlyData[]
  porVehiculo: Array<{ key: string; count: number; km: number }>
  porRegion: Array<{ key: string; count: number; monto: number }>
}

type CatalogData = {
  regions: Array<{ id: number; nombre: string }>
  vehicleTypes: Array<{ id: number; nombre: string }>
}

type Props = {
  dictionary: Record<string, any>
}

const FleetsDashboard = ({ dictionary }: Props) => {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalRequestsOpen, setModalRequestsOpen] = useState(false)
  const [filters, setFilters] = useState({
    fechaInicio: '',
    fechaFin: '',
    estatus: '',
    region: '',
    vehicleType: ''
  })
  const [catalogs, setCatalogs] = useState<CatalogData>({ regions: [], vehicleTypes: [] })

  const t = (key: string) => {
    return key.split('.').reduce((obj, k) => obj?.[k], dictionary) as unknown as string ?? key
  }

  const fetchData = async (filterParams?: string) => {
    try {
      setLoading(true)
      const url = filterParams ? `/api/fleets/dashboard${filterParams}` : '/api/fleets/dashboard'
      const response = await fetch(url)
      if (!response.ok) throw new Error('Failed to fetch dashboard data')
      const result = await response.json()
      setData(result.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const fetchCatalogs = async () => {
    try {
      const [regionsRes, vehicleTypesRes] = await Promise.all([
        fetch('/api/catalogs?type=regions'),
        fetch('/api/catalogs?type=vehicleTypes')
      ])
      const [regionsData, vehicleTypesData] = await Promise.all([
        regionsRes.json(),
        vehicleTypesRes.json()
      ])
      setCatalogs({
        regions: regionsData.data || [],
        vehicleTypes: vehicleTypesData.data || []
      })
    } catch (err) {
      console.error('Failed to fetch catalogs:', err)
    }
  }

  useEffect(() => {
    fetchData()
    fetchCatalogs()
  }, [])

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }))
  }

  const handleSearch = () => {
    const params = new URLSearchParams()
    if (filters.fechaInicio) params.append('fechaInicio', filters.fechaInicio)
    if (filters.fechaFin) params.append('fechaFin', filters.fechaFin)
    if (filters.estatus) params.append('estatus', filters.estatus)
    if (filters.region) params.append('region', filters.region)
    if (filters.vehicleType) params.append('vehicleType', filters.vehicleType)
    const queryString = params.toString()
    fetchData(queryString ? `?${queryString}` : '')
  }

  const handleClear = () => {
    setFilters({
      fechaInicio: '',
      fechaFin: '',
      estatus: '',
      region: '',
      vehicleType: ''
    })
    fetchData()
  }

  if (loading) {
    return (
      <Card>
        <CardContent sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <CircularProgress />
        </CardContent>
      </Card>
    )
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent>
          <Typography color='error'>{error || 'No data available'}</Typography>
        </CardContent>
      </Card>
    )
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <FleetCounterCards t={t} counters={data.counters} />
      </Grid>
      <Grid size={{ xs: 12 }}>
        <FleetFilters
          t={t}
          values={filters}
          onChange={handleFilterChange}
          onSearch={handleSearch}
          onClear={handleClear}
          regions={catalogs.regions}
          vehicleTypes={catalogs.vehicleTypes}
        />
      </Grid>
      <Grid size={{ xs: 12 }}>
        <Typography variant='h6' sx={{ fontWeight: 600, mb: 2, color: '#1f2937' }}>
          {t('dashboard.fleets.kpiCards')}
        </Typography>
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <KpiCard
          title={t('dashboard.fleets.requestsByMonth')}
          borderColor='#0d6efd'
          iconBackground='rgba(13,110,253,.12)'
          iconColor='#0d6efd'
          iconClass='ri-bar-chart-line'
          action={
            <IconButton size='small' onClick={() => setModalRequestsOpen(true)} sx={{ color: '#6b7280' }}>
              <i className='ri-eye-line' style={{ fontSize: '1.1rem' }} />
            </IconButton>
          }
        >
          <RequestsByMonthChart t={t} data={data.monthlyKm} />
        </KpiCard>
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <KpiCard
          title={t('dashboard.fleets.byVehicle')}
          borderColor='#28a745'
          iconBackground='rgba(40,167,69,.12)'
          iconColor='#28a745'
          iconClass='ri-truck-line'
        >
          <ByVehicleChart t={t} data={data.porVehiculo} />
        </KpiCard>
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <KpiCard
          title={t('dashboard.fleets.mileage')}
          borderColor='#17a2b8'
          iconBackground='rgba(23,162,184,.12)'
          iconColor='#17a2b8'
          iconClass='ri-gauge-line'
        >
          <MileageChart t={t} data={data.monthlyKm} />
        </KpiCard>
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <KpiCard
          title={t('dashboard.fleets.fuelConsumption')}
          borderColor='#ffc107'
          iconBackground='rgba(255,193,7,.12)'
          iconColor='#ffc107'
          iconClass='ri-flashlight-line'
        >
          <FuelConsumptionChart t={t} data={data.fuelData} />
        </KpiCard>
      </Grid>
      <Grid size={{ xs: 12 }}>
        <KpiCard
          title={t('filters.region')}
          borderColor='#6f42c1'
          iconBackground='rgba(111,66,193,.12)'
          iconColor='#6f42c1'
          iconClass='ri-map-pin-line'
        >
          <ByRegionChart t={t} data={data.porRegion} />
        </KpiCard>
      </Grid>

      <ChartModal
        open={modalRequestsOpen}
        onClose={() => setModalRequestsOpen(false)}
        title={t('dashboard.fleets.requestsByMonth')}
      >
        <RequestsByMonthChart t={t} data={data.monthlyKm} height={450} />
      </ChartModal>
    </Grid>
  )
}

export default FleetsDashboard
