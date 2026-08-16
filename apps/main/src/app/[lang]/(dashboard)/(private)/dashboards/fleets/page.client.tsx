'use client'

/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable padding-line-between-statements */
/* eslint-disable newline-before-return */
/* eslint-disable import/order */

import { useEffect, useState } from 'react'
import Grid from '@mui/material/Grid2'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'

import FleetCounterCards from '@views/dashboards/fleets/FleetCounterCards'
import FleetFilters from '@views/dashboards/fleets/FleetFilters'
import MonthlyExpenseChart from '@views/dashboards/fleets/MonthlyExpenseChart'
import FleetStatusPieChart from '@views/dashboards/fleets/FleetStatusPieChart'
import FleetBarChart from '@views/dashboards/fleets/FleetBarChart'
import FleetInsightsPanel from '@views/dashboards/fleets/FleetInsightsPanel'
import FleetTable from '@views/dashboards/fleets/FleetTable'
import KpiCard from '@views/dashboards/components/KpiCard'
import ChartModal from '@views/dashboards/components/ChartModal'
import DashboardLoading from '@views/dashboards/components/DashboardLoading'
import DashboardError from '@views/dashboards/components/DashboardError'
import { getCurrentYearRange } from '@/utils/date-range'

type MonthlyData = { month: string; year: string; count: number; monto: number }
type StatusData = { key: string; count: number }
type FleetTableData = { key: string; count: number; monto: number }

type DashboardData = {
  counters: {
    gastoTotal: number
    solicitado: number
    unidades: number
    promedio: number
    solicitudes: number
    diferencia: number
  }
  monthlyKm: MonthlyData[]
  statusData: StatusData[]
  porUnidad: FleetTableData[]
  porTipo: FleetTableData[]
  porResponsable: FleetTableData[]
  porTaller: FleetTableData[]
  unitsTable: FleetTableData[]
  facturadoPagado: FleetTableData[]
  insights: {
    topUnit: { label: string; value: number } | null
    topType: { label: string; value: number } | null
    topResponsible: { label: string; value: number } | null
    pending: number
  }
}

type CatalogData = {
  vehicleNoEconomico: Array<{ id: number; nombre: string }>
  vehicleExpenseTypes: Array<{ id: number; nombre: string }>
  vehicleResponsibles: Array<{ id: number; nombre: string }>
}

type Props = {
  dictionary: Record<string, any>
}

const FleetsDashboard = ({ dictionary }: Props) => {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchKey, setSearchKey] = useState(0)
  const [modalMonthlyOpen, setModalMonthlyOpen] = useState(false)
  const defaultDates = getCurrentYearRange()
  const [filters, setFilters] = useState({
    fechaInicio: defaultDates.fechaInicio,
    fechaFin: defaultDates.fechaFin,
    noEconomico: [] as string[],
    tipoGasto: [] as string[],
    responsable: [] as string[],
    estatus: [] as string[]
  })
  const [catalogs, setCatalogs] = useState<CatalogData>({ vehicleNoEconomico: [], vehicleExpenseTypes: [], vehicleResponsibles: [] })

  const t = (key: string) => {
    return key.split('.').reduce((obj, k) => obj?.[k], dictionary) as unknown as string ?? key
  }

  const buildParams = () => {
    const params = new URLSearchParams()
    if (filters.fechaInicio) params.append('fechaInicio', filters.fechaInicio)
    if (filters.fechaFin) params.append('fechaFin', filters.fechaFin)
    filters.noEconomico.forEach(v => { if (v) params.append('noEconomico', v) })
    filters.tipoGasto.forEach(v => { if (v) params.append('tipoGasto', v) })
    filters.responsable.forEach(v => { if (v) params.append('responsable', v) })
    filters.estatus.forEach(v => { if (v) params.append('estatus', v) })
    return params
  }

  const fetchData = async (signal?: AbortSignal) => {
    try {
      if (data !== null) setRefreshing(true)
      setLoading(true)
      const params = buildParams()
      const url = params.toString() ? `/api/fleets/dashboard?${params.toString()}` : '/api/fleets/dashboard'
      const response = await fetch(url, { signal })
      if (!response.ok) throw new Error('Failed to fetch dashboard data')
      const result = await response.json()
      setData(result.data)
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const fetchCatalogs = async () => {
    try {
      const [noEcoRes, tipoRes, respRes] = await Promise.all([
        fetch('/api/catalogs?type=vehicleNoEconomico'),
        fetch('/api/catalogs?type=vehicleExpenseTypes'),
        fetch('/api/catalogs?type=vehicleResponsibles')
      ])
      const [noEco, tipos, resps] = await Promise.all([
        noEcoRes.json(),
        tipoRes.json(),
        respRes.json()
      ])
      setCatalogs({
        vehicleNoEconomico: noEco.data || [],
        vehicleExpenseTypes: tipos.data || [],
        vehicleResponsibles: resps.data || []
      })
    } catch (err) {
      console.error('Failed to fetch catalogs:', err)
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    fetchData(controller.signal)
    fetchCatalogs()
    return () => controller.abort()
  }, [searchKey])

  const handleFilterChange = (field: string, value: string | string[]) => {
    setFilters(prev => ({ ...prev, [field]: value }))
  }

  const handleSearch = () => {
    setRefreshing(false)
    setSearchKey(prev => prev + 1)
  }

  const handleClear = () => {
    setFilters({
      fechaInicio: '',
      fechaFin: '',
      noEconomico: [],
      tipoGasto: [],
      responsable: [],
      estatus: []
    })
    setSearchKey(prev => prev + 1)
  }

  const handleReload = () => {
    setRefreshing(false)
    setSearchKey(prev => prev + 1)
  }

  if (loading) {
    return <DashboardLoading />
  }

  if (error || !data) {
    return <DashboardError message={error || 'No data available'} />
  }

  return (
    <Grid container spacing={3}>
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
          onReload={handleReload}
          vehicleNoEconomico={catalogs.vehicleNoEconomico}
          vehicleExpenseTypes={catalogs.vehicleExpenseTypes}
          vehicleResponsibles={catalogs.vehicleResponsibles}
        />
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Typography variant='body2' sx={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--mui-palette-text-disabled)', textTransform: 'uppercase', letterSpacing: 1.2, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <i className='ri-truck-line' style={{ fontSize: '1rem' }} />
          {t('dashboard.fleets.main')}
        </Typography>
      </Grid>

      <Grid size={{ xs: 12, xl: 8 }}>
        <KpiCard
          title={t('dashboard.fleets.monthlyExpense')}
          subtitle={t('dashboard.fleets.monthlyExpenseSubtitle')}
          borderColor='#198754'
          iconBackground='rgba(25,135,84,.12)'
          iconColor='#198754'
          iconClass='fa-solid fa-chart-line'
          loading={refreshing}
          action={
            <IconButton size='small' onClick={() => setModalMonthlyOpen(true)} sx={{ color: 'var(--mui-palette-text-secondary)' }}>
              <i className='ri-eye-line' style={{ fontSize: '1.1rem' }} />
            </IconButton>
          }
        >
          <MonthlyExpenseChart t={t} data={data.monthlyKm} />
        </KpiCard>
      </Grid>

      <Grid size={{ xs: 12, xl: 4 }}>
        <KpiCard
          title={t('dashboard.fleets.status')}
          subtitle={t('dashboard.fleets.statusDistribution')}
          borderColor='#0d6efd'
          iconBackground='rgba(13,110,253,.12)'
          iconColor='#0d6efd'
          iconClass='fa-solid fa-chart-pie'
          loading={refreshing}
        >
          <FleetStatusPieChart t={t} data={data.statusData} />
        </KpiCard>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <KpiCard
          title={t('dashboard.fleets.byUnit')}
          subtitle={t('dashboard.fleets.byUnitSubtitle')}
          borderColor='#6f42c1'
          iconBackground='rgba(111,66,193,.12)'
          iconColor='#6f42c1'
          iconClass='fa-solid fa-car'
          loading={refreshing}
        >
          <FleetBarChart data={data.porUnidad} title={t('dashboard.fleets.byUnit')} />
        </KpiCard>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <KpiCard
          title={t('dashboard.fleets.byType')}
          subtitle={t('dashboard.fleets.byTypeSubtitle')}
          borderColor='#ffc107'
          iconBackground='rgba(255,193,7,.15)'
          iconColor='#b45309'
          iconClass='fa-solid fa-tags'
          loading={refreshing}
        >
          <FleetBarChart data={data.porTipo} title={t('dashboard.fleets.byType')} />
        </KpiCard>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <KpiCard
          title={t('dashboard.fleets.byResponsible')}
          subtitle={t('dashboard.fleets.byResponsibleSubtitle')}
          borderColor='#20c997'
          iconBackground='rgba(32,201,151,.12)'
          iconColor='#20c997'
          iconClass='fa-solid fa-user-tie'
          loading={refreshing}
        >
          <FleetBarChart data={data.porResponsable} title={t('dashboard.fleets.byResponsible')} />
        </KpiCard>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <KpiCard
          title={t('dashboard.fleets.byWorkshop')}
          subtitle={t('dashboard.fleets.byWorkshopSubtitle')}
          borderColor='#dc3545'
          iconBackground='rgba(220,53,69,.12)'
          iconColor='#dc3545'
          iconClass='fa-solid fa-wrench'
          loading={refreshing}
        >
          <FleetBarChart data={data.porTaller} title={t('dashboard.fleets.byWorkshop')} />
        </KpiCard>
      </Grid>

      <Grid size={{ xs: 12 }}>
        <KpiCard
          title={t('dashboard.fleets.insights')}
          subtitle={t('dashboard.fleets.insightsSubtitle')}
          borderColor='#6c757d'
          iconBackground='rgba(108,117,125,.12)'
          iconColor='#6c757d'
          iconClass='fa-solid fa-lightbulb'
          loading={refreshing}
        >
          <FleetInsightsPanel t={t} insights={data.insights} />
        </KpiCard>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <KpiCard title={t('dashboard.fleets.unitsTable')} subtitle='' borderColor='#0d6efd' iconBackground='rgba(13,110,253,.12)' iconColor='#0d6efd' iconClass='fa-solid fa-list' loading={refreshing}>
          <FleetTable t={t} title='' data={data.unitsTable} height={300} />
        </KpiCard>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <KpiCard title={t('dashboard.fleets.facturadoPagado')} subtitle='' borderColor='#198754' iconBackground='rgba(25,135,84,.12)' iconColor='#198754' iconClass='fa-solid fa-receipt' loading={refreshing}>
          <FleetTable t={t} title='' data={data.facturadoPagado} height={300} />
        </KpiCard>
      </Grid>

      <ChartModal
        open={modalMonthlyOpen}
        onClose={() => setModalMonthlyOpen(false)}
        title={t('dashboard.fleets.monthlyExpense')}
        t={t}
      >
        <MonthlyExpenseChart t={t} data={data.monthlyKm} height={450} />
      </ChartModal>
    </Grid>
  )
}

export default FleetsDashboard
