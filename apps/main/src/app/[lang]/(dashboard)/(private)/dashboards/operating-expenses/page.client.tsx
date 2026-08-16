'use client'

/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable padding-line-between-statements */
/* eslint-disable newline-before-return */
/* eslint-disable import/order */

import { useEffect, useState } from 'react'
import Grid from '@mui/material/Grid2'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'

import OperatingExpenseCounterCards from '@views/dashboards/operating-expenses/OperatingExpenseCounterCards'
import ExpenseFilters from '@views/dashboards/operating-expenses/ExpenseFilters'
import MonthlyDeptChart from '@views/dashboards/operating-expenses/MonthlyDeptChart'
import MonthlyStatusChart from '@views/dashboards/operating-expenses/MonthlyStatusChart'
import StatusPieChart from '@views/dashboards/operating-expenses/StatusPieChart'
import ByProjectChart from '@views/dashboards/operating-expenses/ByProjectChart'
import ByTypeChart from '@views/dashboards/operating-expenses/ByTypeChart'
import ByDepartmentChart from '@views/dashboards/operating-expenses/ByDepartmentChart'
import InsightsPanel from '@views/dashboards/operating-expenses/InsightsPanel'
import ExpenseTable from '@views/dashboards/operating-expenses/ExpenseTable'
import KpiCard from '@views/dashboards/components/KpiCard'
import ChartModal from '@views/dashboards/components/ChartModal'
import DashboardLoading from '@views/dashboards/components/DashboardLoading'
import DashboardError from '@views/dashboards/components/DashboardError'
import { getCurrentYearRange } from '@/utils/date-range'

type DashboardData = {
  counters: {
    total: number
    facturada: number
    pagada: number
    pendiente: number
    aceptada: number
    rechazada: number
  }
  porMes: Array<{ month: string; year: string; dept: string; monto: number }>
  porMesEstatus: Array<{ month: string; year: string; status: string; monto: number }>
  porDepartamento: Array<{ key: string; count: number; importe: number; facturada: number; pagada: number }>
  porTipo: Array<{ key: string; count: number; importe: number; facturada: number; pagada: number }>
  porSolicitante: Array<{ key: string; count: number; importe: number; facturada: number; pagada: number }>
  porProyecto: Array<{ key: string; count: number; importe: number }>
  facturadoPagado: Array<{ key: string; count: number; importe: number; facturada: number; pagada: number }>
  insights: {
    topProject: { label: string; value: number } | null
    topType: { label: string; value: number } | null
    topApplicant: { label: string; value: number } | null
    pending: number
  }
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
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchKey, setSearchKey] = useState(0)
  const [modalDeptOpen, setModalDeptOpen] = useState(false)
  const [modalStatusOpen, setModalStatusOpen] = useState(false)
  const [modalByProjectOpen, setModalByProjectOpen] = useState(false)
  const [modalByTypeOpen, setModalByTypeOpen] = useState(false)
  const defaultDates = getCurrentYearRange()
  const [filters, setFilters] = useState({
    fechaInicio: defaultDates.fechaInicio,
    fechaFin: defaultDates.fechaFin,
    estatus: [] as string[],
    proyecto: [] as string[],
    region: [] as string[],
    tipoGasto: [] as string[],
    departamento: [] as string[],
    solicitante: [] as string[]
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

  const buildParams = () => {
    const params = new URLSearchParams()
    if (filters.fechaInicio) params.append('fechaInicio', filters.fechaInicio)
    if (filters.fechaFin) params.append('fechaFin', filters.fechaFin)
    filters.estatus.forEach(v => { if (v) params.append('estatus', v) })
    filters.proyecto.forEach(v => { if (v) params.append('proyecto', v) })
    filters.region.forEach(v => { if (v) params.append('region', v) })
    filters.tipoGasto.forEach(v => { if (v) params.append('tipoGasto', v) })
    filters.departamento.forEach(v => { if (v) params.append('departamento', v) })
    filters.solicitante.forEach(v => { if (v) params.append('solicitante', v) })
    return params
  }

  const fetchData = async (signal?: AbortSignal) => {
    try {
      if (data !== null) setRefreshing(true)
      setLoading(true)
      const params = buildParams()
      const response = await fetch(`/api/operating-expenses/dashboard?${params.toString()}`, { signal })
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

  useEffect(() => {
    const controller = new AbortController()
    fetchCatalogs()
    fetchData(controller.signal)
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
      estatus: [],
      proyecto: [],
      region: [],
      tipoGasto: [],
      departamento: [],
      solicitante: []
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

  const projectChartData = data.porProyecto.map(p => ({ key: p.key, count: p.count, monto: p.importe }))

  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12 }}>
        <OperatingExpenseCounterCards t={t} counters={data.counters} />
      </Grid>

      <Grid size={{ xs: 12 }}>
        <ExpenseFilters
          t={t}
          filters={catalogs}
          values={filters}
          onChange={handleFilterChange}
          onSearch={handleSearch}
          onClear={handleClear}
          onReload={handleReload}
        />
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Typography variant='body2' sx={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--mui-palette-text-disabled)', textTransform: 'uppercase', letterSpacing: 1.2, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <i className='ri-money-dollar-circle-line' style={{ fontSize: '1rem' }} />
          {t('dashboard.expenses.main')}
        </Typography>
      </Grid>

      <Grid size={{ xs: 12, xl: 8 }}>
        <KpiCard
          title={t('dashboard.expenses.monthlyByDept')}
          subtitle={t('dashboard.expenses.monthlyByDeptSubtitle')}
          borderColor='#198754'
          iconBackground='rgba(25,135,84,.12)'
          iconColor='#198754'
          iconClass='fa-solid fa-chart-line'
          loading={refreshing}
          action={
            <IconButton size='small' onClick={() => setModalDeptOpen(true)} sx={{ color: 'var(--mui-palette-text-secondary)' }}>
              <i className='ri-eye-line' style={{ fontSize: '1.1rem' }} />
            </IconButton>
          }
        >
          <MonthlyDeptChart data={data.porMes} />
        </KpiCard>
      </Grid>

      <Grid size={{ xs: 12, xl: 4 }}>
        <KpiCard
          title={t('dashboard.expenses.status')}
          subtitle={t('dashboard.expenses.statusDistribution')}
          borderColor='#0d6efd'
          iconBackground='rgba(13,110,253,.12)'
          iconColor='#0d6efd'
          iconClass='fa-solid fa-chart-pie'
          loading={refreshing}
        >
          <StatusPieChart t={t} data={data.facturadoPagado} />
        </KpiCard>
      </Grid>

      <Grid size={{ xs: 12, xl: 8 }}>
        <KpiCard
          title={t('dashboard.expenses.monthlyByStatus')}
          subtitle={t('dashboard.expenses.monthlyByStatusSubtitle')}
          borderColor='#6f42c1'
          iconBackground='rgba(111,66,193,.12)'
          iconColor='#6f42c1'
          iconClass='fa-solid fa-chart-bar'
          loading={refreshing}
          action={
            <IconButton size='small' onClick={() => setModalStatusOpen(true)} sx={{ color: 'var(--mui-palette-text-secondary)' }}>
              <i className='ri-eye-line' style={{ fontSize: '1.1rem' }} />
            </IconButton>
          }
        >
          <MonthlyStatusChart data={data.porMesEstatus} />
        </KpiCard>
      </Grid>

      <Grid size={{ xs: 12, xl: 4 }}>
        <KpiCard
          title={t('dashboard.expenses.expensesByMonth')}
          subtitle={t('dashboard.expenses.paidAmount')}
          borderColor='#20c997'
          iconBackground='rgba(32,201,151,.12)'
          iconColor='#20c997'
          iconClass='fa-solid fa-building'
          loading={refreshing}
        >
          <ByDepartmentChart t={t} data={data.porDepartamento.map(d => ({ key: d.key, count: d.count, monto: d.importe }))} />
        </KpiCard>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <KpiCard
          title={t('dashboard.expenses.topProjects')}
          subtitle={t('dashboard.expenses.topProjectsSubtitle')}
          borderColor='#ffc107'
          iconBackground='rgba(255,193,7,.15)'
          iconColor='#b45309'
          iconClass='fa-solid fa-list-check'
          loading={refreshing}
          action={
            <IconButton size='small' onClick={() => setModalByProjectOpen(true)} sx={{ color: 'var(--mui-palette-text-secondary)' }}>
              <i className='ri-eye-line' style={{ fontSize: '1.1rem' }} />
            </IconButton>
          }
        >
          <ByProjectChart t={t} data={projectChartData} />
        </KpiCard>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <KpiCard
          title={t('dashboard.expenses.requestType')}
          subtitle={t('dashboard.expenses.requestType')}
          borderColor='#dc3545'
          iconBackground='rgba(220,53,69,.12)'
          iconColor='#dc3545'
          iconClass='fa-solid fa-tags'
          loading={refreshing}
          action={
            <IconButton size='small' onClick={() => setModalByTypeOpen(true)} sx={{ color: 'var(--mui-palette-text-secondary)' }}>
              <i className='ri-eye-line' style={{ fontSize: '1.1rem' }} />
            </IconButton>
          }
        >
          <ByTypeChart t={t} data={data.porTipo.map(d => ({ key: d.key, count: d.count }))} />
        </KpiCard>
      </Grid>

      <Grid size={{ xs: 12 }}>
        <KpiCard
          title={t('dashboard.expenses.insights')}
          subtitle={t('dashboard.expenses.insightsSubtitle')}
          borderColor='#6c757d'
          iconBackground='rgba(108,117,125,.12)'
          iconColor='#6c757d'
          iconClass='fa-solid fa-lightbulb'
          loading={refreshing}
        >
          <InsightsPanel t={t} insights={data.insights} />
        </KpiCard>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <KpiCard title={t('dashboard.expenses.byApplicant')} subtitle='' borderColor='#0d6efd' iconBackground='rgba(13,110,253,.12)' iconColor='#0d6efd' iconClass='fa-solid fa-user-tie' loading={refreshing}>
          <ExpenseTable t={t} title='' data={data.porSolicitante} height={300} />
        </KpiCard>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <KpiCard title={t('dashboard.expenses.byDepartment')} subtitle='' borderColor='#198754' iconBackground='rgba(25,135,84,.12)' iconColor='#198754' iconClass='fa-solid fa-building' loading={refreshing}>
          <ExpenseTable t={t} title='' data={data.porDepartamento} height={300} />
        </KpiCard>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <KpiCard title={t('dashboard.expenses.byType')} subtitle='' borderColor='#ffc107' iconBackground='rgba(255,193,7,.15)' iconColor='#b45309' iconClass='fa-solid fa-tags' loading={refreshing}>
          <ExpenseTable t={t} title='' data={data.porTipo} height={300} />
        </KpiCard>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <KpiCard title={t('dashboard.expenses.facturadoPagado')} subtitle='' borderColor='#20c997' iconBackground='rgba(32,201,151,.12)' iconColor='#20c997' iconClass='fa-solid fa-receipt' loading={refreshing}>
          <ExpenseTable t={t} title='' data={data.facturadoPagado} height={300} />
        </KpiCard>
      </Grid>

      <ChartModal open={modalDeptOpen} onClose={() => setModalDeptOpen(false)} title={t('dashboard.expenses.monthlyByDept')} t={t}>
        <MonthlyDeptChart data={data.porMes} height={450} />
      </ChartModal>

      <ChartModal open={modalStatusOpen} onClose={() => setModalStatusOpen(false)} title={t('dashboard.expenses.monthlyByStatus')} t={t}>
        <MonthlyStatusChart data={data.porMesEstatus} height={450} />
      </ChartModal>

      <ChartModal open={modalByProjectOpen} onClose={() => setModalByProjectOpen(false)} title={t('dashboard.expenses.topProjects')} t={t}>
        <ByProjectChart t={t} data={projectChartData} height={450} />
      </ChartModal>

      <ChartModal open={modalByTypeOpen} onClose={() => setModalByTypeOpen(false)} title={t('dashboard.expenses.requestType')} t={t}>
        <ByTypeChart t={t} data={data.porTipo.map(d => ({ key: d.key, count: d.count }))} />
      </ChartModal>
    </Grid>
  )
}

export default OperatingExpensesDashboard
