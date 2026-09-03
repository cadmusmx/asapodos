'use client'

import { useCallback, useEffect, useState } from 'react'

import Grid from '@mui/material/Grid2'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'

import EmployeeCounterCards from '@views/dashboards/human-capital/EmployeeCounterCards'
import HumanCapitalFilters from '@views/dashboards/human-capital/HumanCapitalFilters'
import ByDepartmentChart from '@views/dashboards/human-capital/ByDepartmentChart'
import HiresTerminationsChart from '@views/dashboards/human-capital/HiresTerminationsChart'
import ByRegionChart from '@views/dashboards/human-capital/ByRegionChart'
import ByPositionChart from '@views/dashboards/human-capital/ByPositionChart'
import SeniorityChart from '@views/dashboards/human-capital/SeniorityChart'
import GenderDistributionChart from '@views/dashboards/human-capital/GenderDistributionChart'
import KpiCard from '@views/dashboards/components/KpiCard'
import ChartModal from '@views/dashboards/components/ChartModal'
import DashboardLoading from '@views/dashboards/components/DashboardLoading'
import DashboardError from '@views/dashboards/components/DashboardError'
import FontAwesomeIconComponent from '@views/dashboards/components/FontAwesomeIcon'

type DashboardData = {
  counters: {
    totalEmpleados: number
    totalActivos: number
    totalInactivos: number
    totalAltas: number
    totalBajas: number
  }
  porDepartamento: Array<{ key: string; count: number }>
  movimientosPorMes: Array<{ month: string; year: string; type: string; count: number }>
  porRegion: Array<{ key: string; count: number }>
  porPuesto: Array<{ key: string; count: number }>
  antiguedad: Array<{ bucket: string; count: number }>
  porGenero: Array<{ key: string; count: number }>
}

type Props = {
  dictionary: Record<string, any>
}

type CatalogData = {
  areas: Array<{ id: number; nombre: string }>
  departments: Array<{ id: number; nombre: string }>
  positions: Array<{ id: number; nombre: string }>
  regions: Array<{ id: number; nombre: string }>
}

const HumanCapitalDashboard = ({ dictionary }: Props) => {
  const [data, setData] = useState<DashboardData | null>(null)
  const [catalogs, setCatalogs] = useState<CatalogData>({ areas: [], departments: [], positions: [], regions: [] })
  const [loading, setLoading] = useState(true)
  const [, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchKey, setSearchKey] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)

  const [filters, setFilters] = useState({
    activo: '',
    area: '' as number | '',
    departamento: '' as number | '',
    puesto: '' as number | '',
    region: '' as number | ''
  })

  const t = (key: string) => {
    return (key.split('.').reduce((obj, k) => obj?.[k], dictionary) as unknown as string) ?? key
  }

  const fetchCatalogs = async () => {
    try {
      const [areasRes, deptsRes, positionsRes, regionsRes] = await Promise.all([
        fetch('/api/catalogs?type=areas'),
        fetch('/api/catalogs?type=departments'),
        fetch('/api/catalogs?type=positions'),
        fetch('/api/catalogs?type=regions')
      ])

      const [areas, depts, positions, regions] = await Promise.all([
        areasRes.json(),
        deptsRes.json(),
        positionsRes.json(),
        regionsRes.json()
      ])

      setCatalogs({
        areas: areas.data || [],
        departments: depts.data || [],
        positions: positions.data || [],
        regions: regions.data || []
      })
    } catch (err) {
      console.error('Failed to fetch catalogs:', err)
    }
  }

  const fetchData = useCallback(
    async (signal?: AbortSignal) => {
      try {
        setRefreshing(true)
        setLoading(true)
        const params = new URLSearchParams()

        if (filters.activo) params.set('active', filters.activo === 'A' ? 'active' : 'inactive')
        if (filters.area) params.set('area', String(filters.area))
        if (filters.departamento) params.set('department', String(filters.departamento))
        if (filters.puesto) params.set('puesto', String(filters.puesto))
        if (filters.region) params.set('region', String(filters.region))

        const response = await fetch(`/api/human-capital/dashboard?${params.toString()}`, { signal })

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
    },
    [filters]
  )

  useEffect(() => {
    const controller = new AbortController()

    fetchCatalogs()
    fetchData(controller.signal)

    return () => controller.abort()
  }, [searchKey, fetchData])

  const handleFilterChange = (field: string, value: string | number) => {
    setFilters(prev => ({ ...prev, [field]: value }))
  }

  const handleSearch = () => {
    setRefreshing(false)
    setSearchKey(prev => prev + 1)
  }

  const handleClear = () => {
    setFilters({
      activo: '',
      area: '',
      departamento: '',
      puesto: '',
      region: ''
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
      {/* Counter Cards */}
      <Grid size={{ xs: 12 }}>
        <EmployeeCounterCards t={t} counters={data.counters} />
      </Grid>

      {/* Filters */}
      <Grid size={{ xs: 12 }}>
        <HumanCapitalFilters
          t={t}
          filters={catalogs}
          values={filters}
          onChange={handleFilterChange}
          onSearch={handleSearch}
          onClear={handleClear}
          onReload={handleReload}
        />
      </Grid>

      {/* Section Label */}
      <Grid size={{ xs: 12 }}>
        <Typography
          variant='body2'
          sx={{
            fontSize: '0.85rem',
            fontWeight: 700,
            color: 'var(--mui-palette-text-disabled)',
            textTransform: 'uppercase',
            letterSpacing: 1.2,
            mb: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}
        >
          <FontAwesomeIconComponent icon='fa-solid fa-people-roof' style={{ fontSize: '1rem' }} />
          {t('dashboard.humanCapital.title')}
        </Typography>
      </Grid>

      {/* KPI Chart Cards - 3 column layout */}
      <Grid size={{ xs: 12, md: 6, xl: 4 }}>
        <KpiCard
          title={t('dashboard.humanCapital.byDepartment')}
          subtitle={t('dashboard.humanCapital.departmentDistribution')}
          borderColor='#0d6efd'
          iconBackground='rgba(13,110,253,.12)'
          iconColor='#0d6efd'
          iconClass='fa-solid fa-building'
        >
          <ByDepartmentChart t={t} data={data.porDepartamento} />
        </KpiCard>
      </Grid>

      <Grid size={{ xs: 12, md: 6, xl: 4 }}>
        <KpiCard
          title={t('dashboard.humanCapital.hiresTerminations')}
          subtitle={t('dashboard.humanCapital.monthlyMovements')}
          borderColor='#198754'
          iconBackground='rgba(25,135,84,.12)'
          iconColor='#198754'
          iconClass='fa-solid fa-chart-line'
        >
          <HiresTerminationsChart t={t} data={data.movimientosPorMes} />
        </KpiCard>
      </Grid>

      <Grid size={{ xs: 12, md: 6, xl: 4 }}>
        <KpiCard
          title={t('dashboard.humanCapital.byRegion')}
          subtitle={t('dashboard.humanCapital.employeesByRegion')}
          borderColor='#20c997'
          iconBackground='rgba(32,201,151,.12)'
          iconColor='#20c997'
          iconClass='fa-solid fa-map-location-dot'
        >
          <ByRegionChart t={t} data={data.porRegion} />
        </KpiCard>
      </Grid>

      <Grid size={{ xs: 12, md: 6, xl: 4 }}>
        <KpiCard
          title={t('dashboard.humanCapital.byPosition')}
          subtitle={t('dashboard.humanCapital.topPositions')}
          borderColor='#ffc107'
          iconBackground='rgba(255,193,7,.15)'
          iconColor='#b45309'
          iconClass='fa-solid fa-briefcase'
          action={
            <IconButton
              size='small'
              onClick={() => setModalOpen(true)}
              sx={{ color: 'var(--mui-palette-text-secondary)' }}
            >
              <i className='ri-eye-line' style={{ fontSize: '1.1rem' }} />
            </IconButton>
          }
        >
          <ByPositionChart t={t} data={data.porPuesto} />
        </KpiCard>
      </Grid>

      <Grid size={{ xs: 12, md: 6, xl: 4 }}>
        <KpiCard
          title={t('dashboard.humanCapital.seniority')}
          subtitle={t('dashboard.humanCapital.seniorityDistribution')}
          borderColor='#dc3545'
          iconBackground='rgba(220,53,69,.12)'
          iconColor='#dc3545'
          iconClass='fa-solid fa-clock-rotate-left'
        >
          <SeniorityChart t={t} data={data.antiguedad} />
        </KpiCard>
      </Grid>

      <Grid size={{ xs: 12, md: 6, xl: 4 }}>
        <KpiCard
          title={t('dashboard.humanCapital.byGender')}
          subtitle={t('dashboard.humanCapital.genderDistribution')}
          borderColor='#6f42c1'
          iconBackground='rgba(111,66,193,.12)'
          iconColor='#6f42c1'
          iconClass='fa-solid fa-venus-mars'
        >
          <GenderDistributionChart t={t} data={data.porGenero} />
        </KpiCard>
      </Grid>

      <ChartModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={t('dashboard.humanCapital.byPosition')}
        t={t}
      >
        <ByPositionChart t={t} data={data.porPuesto} height={450} />
      </ChartModal>
    </Grid>
  )
}

export default HumanCapitalDashboard
