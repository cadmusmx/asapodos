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

import ProjectCounterCards from '@views/dashboards/projects/ProjectCounterCards'
import ProjectFilters from '@views/dashboards/projects/ProjectFilters'
import TotalExpenseByProjectChart from '@views/dashboards/projects/TotalExpenseByProjectChart'
import BudgetVsActualChart from '@views/dashboards/projects/BudgetVsActualChart'
import TopEmployeesChart from '@views/dashboards/projects/TopEmployeesChart'
import FinancialStatus from '@views/dashboards/projects/FinancialStatus'
import ProfitabilityChart from '@views/dashboards/projects/ProfitabilityChart'
import KpiCard from '@views/dashboards/components/KpiCard'
import ChartModal from '@views/dashboards/components/ChartModal'

type ProjectItem = {
  id: number
  nombre: string
  cliente: string
  presupuesto: number
  gasto: number
  margen: number | null
  responsable: string
  estatus: number
  porcentaje?: number
  estado?: 'onBudget' | 'exceeding' | 'exceeded'
}

type CatalogData = {
  clients: Array<{ id: number; nombre: string }>
  regions: Array<{ id: number; nombre: string }>
  departments: Array<{ id: number; nombre: string }>
  employees: Array<{ id: number; nombre: string }>
}

type DashboardData = {
  counters: {
    total: number
    activos: number
    inactivos: number
  }
  proyectos: ProjectItem[]
  proyectosPorcentaje: ProjectItem[]
  topEmpleados: Array<{ key: string; count: number }>
}

type Props = {
  dictionary: Record<string, any>
}

const ProjectsDashboard = ({ dictionary }: Props) => {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalTotalExpenseOpen, setModalTotalExpenseOpen] = useState(false)
  const [modalBudgetVsActualOpen, setModalBudgetVsActualOpen] = useState(false)
  const [modalTopEmployeesOpen, setModalTopEmployeesOpen] = useState(false)
  const [filters, setFilters] = useState({
    fechaInicio: '',
    fechaFin: '',
    cliente: '',
    estatus: '',
    region: '',
    departamento: '',
    responsable: ''
  })
  const [catalogs, setCatalogs] = useState<CatalogData>({ clients: [], regions: [], departments: [], employees: [] })

  const t = (key: string) => {
    return key.split('.').reduce((obj, k) => obj?.[k], dictionary) as unknown as string ?? key
  }

  const fetchCatalogs = async () => {
    try {
      const [clientsRes, regionsRes, deptsRes, employeesRes] = await Promise.all([
        fetch('/api/catalogs?type=clients'),
        fetch('/api/catalogs?type=regions'),
        fetch('/api/catalogs?type=departments'),
        fetch('/api/catalogs?type=employees')
      ])
      const [clients, regions, departments, employees] = await Promise.all([
        clientsRes.json(),
        regionsRes.json(),
        deptsRes.json(),
        employeesRes.json()
      ])
      setCatalogs({
        clients: clients.data || [],
        regions: regions.data || [],
        departments: departments.data || [],
        employees: employees.data || []
      })
    } catch (err) {
      console.error('Failed to fetch catalogs:', err)
    }
  }

  const fetchData = async (currentFilters?: typeof filters) => {
    const activeFilters = currentFilters ?? filters
    try {
      const params = new URLSearchParams()
      if (activeFilters.fechaInicio) params.set('fechaInicio', activeFilters.fechaInicio)
      if (activeFilters.fechaFin) params.set('fechaFin', activeFilters.fechaFin)
      if (activeFilters.cliente) params.set('cliente', activeFilters.cliente)
      if (activeFilters.estatus) params.set('estatus', activeFilters.estatus)
      if (activeFilters.region) params.set('region', activeFilters.region)
      if (activeFilters.departamento) params.set('departamento', activeFilters.departamento)
      if (activeFilters.responsable) params.set('responsable', activeFilters.responsable)

      const response = await fetch(`/api/projects/dashboard?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch dashboard data')
      const result = await response.json()
      setData(result.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCatalogs()
    fetchData()
  }, [])

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }))
  }

  const handleSearch = () => {
    setLoading(true)
    fetchData(filters)
  }

  const handleClear = () => {
    const emptyFilters = {
      fechaInicio: '',
      fechaFin: '',
      cliente: '',
      estatus: '',
      region: '',
      departamento: '',
      responsable: ''
    }
    setFilters(emptyFilters)
    setLoading(true)
    fetchData(emptyFilters)
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
    <Grid container spacing={3}>
      <Grid size={{ xs: 12 }}>
        <ProjectCounterCards t={t} counters={data.counters} />
      </Grid>

      <Grid size={{ xs: 12 }}>
        <ProjectFilters
          t={t}
          values={filters}
          onChange={handleFilterChange}
          onSearch={handleSearch}
          onClear={handleClear}
          catalogs={catalogs}
        />
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Typography
          variant='body2'
          sx={{
            fontSize: '0.85rem',
            fontWeight: 700,
            color: '#9ca3af',
            textTransform: 'uppercase',
            letterSpacing: 1.2,
            mb: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}
        >
          <i className='ri-bar-chart-line' style={{ fontSize: '1rem' }} />
          {t('dashboard.projects.analysis')}
        </Typography>
      </Grid>

      <Grid size={{ xs: 12 }}>
        <KpiCard
          title={t('dashboard.projects.totalExpenseByProject')}
          subtitle={t('dashboard.projects.totalExpenseSubtitle')}
          borderColor='#0d6efd'
          iconBackground='rgba(13,110,253,.12)'
          iconColor='#0d6efd'
          iconClass='fa-solid fa-circle-dollar-to-slot'
          action={
            <IconButton size='small' onClick={() => setModalTotalExpenseOpen(true)} sx={{ color: '#6b7280' }}>
              <i className='ri-eye-line' style={{ fontSize: '1.1rem' }} />
            </IconButton>
          }
        >
          <TotalExpenseByProjectChart t={t} data={data.proyectos} />
        </KpiCard>
      </Grid>

      <Grid size={{ xs: 12 }}>
        <KpiCard
          title={t('dashboard.projects.budgetVsActual')}
          subtitle={t('dashboard.projects.budgetVsActualSubtitle')}
          borderColor='#198754'
          iconBackground='rgba(25,135,84,.12)'
          iconColor='#198754'
          iconClass='fa-solid fa-scale-balanced'
          action={
            <IconButton size='small' onClick={() => setModalBudgetVsActualOpen(true)} sx={{ color: '#6b7280' }}>
              <i className='ri-eye-line' style={{ fontSize: '1.1rem' }} />
            </IconButton>
          }
        >
          <BudgetVsActualChart t={t} data={data.proyectosPorcentaje} />
        </KpiCard>
      </Grid>

      <Grid size={{ xs: 12 }}>
        <KpiCard
          title={t('dashboard.projects.topEmployees')}
          subtitle={t('dashboard.projects.topEmployeesSubtitle')}
          borderColor='#ffc107'
          iconBackground='rgba(255,193,7,.15)'
          iconColor='#b45309'
          iconClass='fa-solid fa-user-tie'
          action={
            <IconButton size='small' onClick={() => setModalTopEmployeesOpen(true)} sx={{ color: '#6b7280' }}>
              <i className='ri-eye-line' style={{ fontSize: '1.1rem' }} />
            </IconButton>
          }
        >
          <TopEmployeesChart t={t} data={data.topEmpleados} />
        </KpiCard>
      </Grid>

      <Grid size={{ xs: 12 }}>
        <KpiCard
          title={t('dashboard.projects.financialStatus')}
          subtitle={t('dashboard.projects.financialStatusSubtitle')}
          borderColor='#dc3545'
          iconBackground='rgba(220,53,69,.12)'
          iconColor='#dc3545'
          iconClass='fa-solid fa-traffic-light'
        >
          <FinancialStatus t={t} data={data.proyectosPorcentaje} />
        </KpiCard>
      </Grid>

      <Grid size={{ xs: 12 }}>
        <KpiCard
          title={t('dashboard.projects.profitability')}
          subtitle={t('dashboard.projects.profitabilitySubtitle')}
          borderColor='#6f42c1'
          iconBackground='rgba(111,66,193,.12)'
          iconColor='#6f42c1'
          iconClass='fa-solid fa-chart-line'
        >
          <ProfitabilityChart t={t} data={data.proyectos} />
        </KpiCard>
      </Grid>

      <ChartModal
        open={modalTotalExpenseOpen}
        onClose={() => setModalTotalExpenseOpen(false)}
        title={t('dashboard.projects.totalExpenseByProject')}
      >
        <TotalExpenseByProjectChart t={t} data={data.proyectos} height={450} />
      </ChartModal>

      <ChartModal
        open={modalBudgetVsActualOpen}
        onClose={() => setModalBudgetVsActualOpen(false)}
        title={t('dashboard.projects.budgetVsActual')}
      >
        <BudgetVsActualChart t={t} data={data.proyectosPorcentaje} height={450} />
      </ChartModal>

      <ChartModal
        open={modalTopEmployeesOpen}
        onClose={() => setModalTopEmployeesOpen(false)}
        title={t('dashboard.projects.topEmployees')}
      >
        <TopEmployeesChart t={t} data={data.topEmpleados} height={450} />
      </ChartModal>
    </Grid>
  )
}

export default ProjectsDashboard
