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

import OperatingExpenseCounterCards from '@views/dashboards/operating-expenses/OperatingExpenseCounterCards'
import ExpenseFilters from '@views/dashboards/operating-expenses/ExpenseFilters'
import ExpensesByMonthChart from '@views/dashboards/operating-expenses/ExpensesByMonthChart'
import ByDepartmentChart from '@views/dashboards/operating-expenses/ByDepartmentChart'
import ByPersonChart from '@views/dashboards/operating-expenses/ByPersonChart'
import ByTypeChart from '@views/dashboards/operating-expenses/ByTypeChart'
import PaymentTypeChart from '@views/dashboards/operating-expenses/PaymentTypeChart'
import ByProjectChart from '@views/dashboards/operating-expenses/ByProjectChart'
import PaymentsChart from '@views/dashboards/operating-expenses/PaymentsChart'
import KpiCard from '@views/dashboards/components/KpiCard'
import ChartModal from '@views/dashboards/components/ChartModal'

type DashboardData = {
  counters: {
    total: number
    aceptadas: number
    pendientes: number
    rechazadas: number
    pagadas: number
    montoPagadas: number
  }
  porMes: Array<{ month: string; year: string; type: string; count: number; monto: number }>
  porDepartamento: Array<{ key: string; count: number; monto?: number }>
  porPersona: Array<{ key: string; count: number; monto?: number }>
  porTipo: Array<{ key: string; count: number }>
  porTipoPago: Array<{ key: string; count: number; monto?: number }>
  porProyecto: Array<{ key: string; count: number; monto?: number }>
  solicitadoVsGastado: Array<{ month: string; year: string; type: string; count: number; monto: number }>
}

type Props = {
  dictionary: Record<string, any>
}

type CatalogData = {
  projects: Array<{ id: number; nombre: string }>
  regions: Array<{ id: number; nombre: string }>
  departments: Array<{ id: number; nombre: string }>
  employees: Array<{ id: number; nombre: string }>
  expenseTypes: Array<{ id: number; nombre: string }>
}

const OperatingExpensesDashboard = ({ dictionary }: Props) => {
  const [data, setData] = useState<DashboardData | null>(null)
  const [catalogs, setCatalogs] = useState<CatalogData>({ projects: [], regions: [], departments: [], employees: [], expenseTypes: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalExpensesMonthOpen, setModalExpensesMonthOpen] = useState(false)
  const [modalByPersonOpen, setModalByPersonOpen] = useState(false)
  const [modalByProjectOpen, setModalByProjectOpen] = useState(false)
  const [modalPaymentsOpen, setModalPaymentsOpen] = useState(false)
  const [filters, setFilters] = useState({
    fechaInicio: '',
    fechaFin: '',
    estatus: '',
    proyecto: '',
    region: '',
    tipoGasto: '',
    departamento: '',
    solicitante: ''
  })

  const t = (key: string) => {
    return key.split('.').reduce((obj, k) => obj?.[k], dictionary) as unknown as string ?? key
  }

  const fetchCatalogs = async () => {
    try {
      const [projectsRes, regionsRes, deptsRes, employeesRes, expenseTypesRes] = await Promise.all([
        fetch('/api/catalogs?type=projects'),
        fetch('/api/catalogs?type=regions'),
        fetch('/api/catalogs?type=departments'),
        fetch('/api/catalogs?type=employees'),
        fetch('/api/catalogs?type=expenseTypes')
      ])
      const [projects, regions, departments, employees, expenseTypes] = await Promise.all([
        projectsRes.json(),
        regionsRes.json(),
        deptsRes.json(),
        employeesRes.json(),
        expenseTypesRes.json()
      ])
      setCatalogs({
        projects: projects.data || [],
        regions: regions.data || [],
        departments: departments.data || [],
        employees: employees.data || [],
        expenseTypes: expenseTypes.data || []
      })
    } catch (err) {
      console.error('Failed to fetch catalogs:', err)
    }
  }

  const fetchData = async (currentFilters?: typeof filters) => {
    const activeFilters = currentFilters ?? filters
    try {
      const params = new URLSearchParams()
      Object.entries(activeFilters).forEach(([key, value]) => {
        if (value) params.set(key, value)
      })
      const response = await fetch(`/api/operating-expenses/dashboard?${params.toString()}`)
      console.log('[Opexp] status:', response.status)
      const text = await response.text()
      console.log('[Opexp] body:', text.slice(0, 500))
      if (!response.ok) throw new Error(`Failed: ${response.status} ${text}`)
      const result = JSON.parse(text)
      setData(result.data)
    } catch (err) {
      console.error('[Opexp] fetchData error:', err)
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
      estatus: '',
      proyecto: '',
      region: '',
      tipoGasto: '',
      departamento: '',
      solicitante: ''
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
      {/* Counter Cards */}
      <Grid size={{ xs: 12 }}>
        <OperatingExpenseCounterCards t={t} counters={data.counters} />
      </Grid>

      {/* Filters */}
      <Grid size={{ xs: 12 }}>
        <ExpenseFilters
          t={t}
          filters={catalogs}
          values={filters}
          onChange={handleFilterChange}
          onSearch={handleSearch}
          onClear={handleClear}
        />
      </Grid>

      {/* Section Label */}
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
          <i className='ri-money-dollar-circle-line' style={{ fontSize: '1rem' }} />
          {t('dashboard.expenses.main')}
        </Typography>
      </Grid>

      {/* KPI Chart Cards - 3 column layout */}
      <Grid size={{ xs: 12, md: 6, xl: 4 }}>
        <KpiCard
          title={t('dashboard.expenses.expensesByMonth')}
          subtitle={t('dashboard.expenses.paidAmount')}
          borderColor='#198754'
          iconBackground='rgba(25,135,84,.12)'
          iconColor='#198754'
          iconClass='fa-solid fa-circle-dollar-to-slot'
          action={
            <IconButton size='small' onClick={() => setModalExpensesMonthOpen(true)} sx={{ color: '#6b7280' }}>
              <i className='ri-eye-line' style={{ fontSize: '1.1rem' }} />
            </IconButton>
          }
        >
          <ExpensesByMonthChart t={t} data={data.porMes} />
        </KpiCard>
      </Grid>

      <Grid size={{ xs: 12, md: 6, xl: 4 }}>
        <KpiCard
          title={t('dashboard.expenses.byDepartment')}
          subtitle={t('dashboard.expenses.byDepartment')}
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
          title={t('dashboard.expenses.requestedVsSpent')}
          subtitle={t('dashboard.expenses.requestedVsSpent')}
          borderColor='#0d6efd'
          iconBackground='rgba(13,110,253,.12)'
          iconColor='#0d6efd'
          iconClass='fa-solid fa-building'
          action={
            <IconButton size='small' onClick={() => setModalPaymentsOpen(true)} sx={{ color: '#6b7280' }}>
              <i className='ri-eye-line' style={{ fontSize: '1.1rem' }} />
            </IconButton>
          }
        >
          <PaymentsChart t={t} data={data.solicitadoVsGastado} />
        </KpiCard>
      </Grid>

      <Grid size={{ xs: 12, md: 6, xl: 4 }}>
        <KpiCard
          title={t('dashboard.expenses.byPerson')}
          subtitle={t('dashboard.expenses.byPerson')}
          borderColor='#ffc107'
          iconBackground='rgba(255,193,7,.15)'
          iconColor='#b45309'
          iconClass='fa-solid fa-user-tie'
          action={
            <IconButton size='small' onClick={() => setModalByPersonOpen(true)} sx={{ color: '#6b7280' }}>
              <i className='ri-eye-line' style={{ fontSize: '1.1rem' }} />
            </IconButton>
          }
        >
          <ByPersonChart t={t} data={data.porPersona} />
        </KpiCard>
      </Grid>

      <Grid size={{ xs: 12, md: 6, xl: 4 }}>
        <KpiCard
          title={t('dashboard.expenses.requestType')}
          subtitle={t('dashboard.expenses.requestType')}
          borderColor='#dc3545'
          iconBackground='rgba(220,53,69,.12)'
          iconColor='#dc3545'
          iconClass='fa-solid fa-tags'
        >
          <ByTypeChart t={t} data={data.porTipo} />
        </KpiCard>
      </Grid>

      <Grid size={{ xs: 12, md: 6, xl: 4 }}>
        <KpiCard
          title={t('dashboard.expenses.paymentType')}
          subtitle={t('dashboard.expenses.paymentType')}
          borderColor='#6f42c1'
          iconBackground='rgba(111,66,193,.12)'
          iconColor='#6f42c1'
          iconClass='fa-solid fa-money-bill-transfer'
        >
          <PaymentTypeChart t={t} data={data.porTipoPago} />
        </KpiCard>
      </Grid>

      {/* Wider card for by project */}
      <Grid size={{ xs: 12, xl: 8 }}>
        <KpiCard
          title={t('dashboard.expenses.byProject')}
          subtitle={t('dashboard.expenses.byProject')}
          borderColor='#20c997'
          iconBackground='rgba(32,201,151,.12)'
          iconColor='#20c997'
          iconClass='fa-solid fa-chart-pie'
          action={
            <IconButton size='small' onClick={() => setModalByProjectOpen(true)} sx={{ color: '#6b7280' }}>
              <i className='ri-eye-line' style={{ fontSize: '1.1rem' }} />
            </IconButton>
          }
        >
          <ByProjectChart t={t} data={data.porProyecto} />
        </KpiCard>
      </Grid>

      <ChartModal
        open={modalExpensesMonthOpen}
        onClose={() => setModalExpensesMonthOpen(false)}
        title={t('dashboard.expenses.expensesByMonth')}
      >
        <ExpensesByMonthChart t={t} data={data.porMes} height={450} />
      </ChartModal>

      <ChartModal
        open={modalByPersonOpen}
        onClose={() => setModalByPersonOpen(false)}
        title={t('dashboard.expenses.byPerson')}
      >
        <ByPersonChart t={t} data={data.porPersona} height={450} />
      </ChartModal>

      <ChartModal
        open={modalByProjectOpen}
        onClose={() => setModalByProjectOpen(false)}
        title={t('dashboard.expenses.byProject')}
      >
        <ByProjectChart t={t} data={data.porProyecto} height={450} />
      </ChartModal>

      <ChartModal
        open={modalPaymentsOpen}
        onClose={() => setModalPaymentsOpen(false)}
        title={t('dashboard.expenses.requestedVsSpent')}
      >
        <PaymentsChart t={t} data={data.solicitadoVsGastado} height={450} />
      </ChartModal>
    </Grid>
  )
}

export default OperatingExpensesDashboard
