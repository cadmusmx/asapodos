'use client'

import { useEffect, useState } from 'react'

import Grid from '@mui/material/Grid2'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'

import GeneralFilters from '@views/dashboards/general/GeneralFilters'
import HumanCapitalDeptChart from '@views/dashboards/general/HumanCapitalDeptChart'
import HumanCapitalHiresChart from '@views/dashboards/general/HumanCapitalHiresChart'
import InventoryMovementsChart from '@views/dashboards/general/InventoryMovementsChart'
import OperatingExpensesChart from '@views/dashboards/general/OperatingExpensesChart'
import ExpensesByProjectChart from '@views/dashboards/general/ExpensesByProjectChart'
import FleetsChart from '@views/dashboards/general/FleetsChart'
import CotizacionesChart from '@views/dashboards/general/CotizacionesChart'
import ProjectsResponsibleChart from '@views/dashboards/general/ProjectsResponsibleChart'
import ProjectsByMonthChart from '@views/dashboards/general/ProjectsByMonthChart'
import ChartModal from '@views/dashboards/components/ChartModal'

type DashboardData = {
  humanCapital: {
    activos: number
    inactivos: number
    porDepto: Array<{ key: string; count: number }>
    altasBajas: Array<{ month: string; year: string; type: string; count: number }>
  }
  inventario: {
    total: number
    palets: number
    arribos: number
    salidas: number
    porMes: Array<{ mes: string; arribos: number; salidas: number; sitiosAtt: number; sitiosTelcel: number }>
  }
  gastos: {
    total: number
    aceptadas: number
    pendientes: number
    rechazadas: number
    pagadas: number
    montoPagadas: number
  }
  gastosPorMes: Array<{ mes: string; year: string; aceptadas: number; rechazadas: number; pagadas: number }>
  gastosPorProyecto: Array<{ key: string; count: number; monto: number }>
  cotizaciones: {
    total: number
    aceptadas: number
    pendientes: number
    rechazadas: number
  }
  proyectos: {
    total: number
    activos: number
    inactivos: number
    porResponsable: Array<{ key: string; count: number }>
    porMes: Array<{ mes: string; year: string; status: string; count: number }>
  }
  flotillas: {
    total: number
    aceptadas: number
    pendientes: number
    rechazadas: number
    porMes: Array<{ mes: string; year: string; aceptadas: number; rechazadas: number; pagadas: number }>
  }
}

type Props = {
  dictionary: Record<string, any>
}

type CatalogData = {
  regions: Array<{ id: number; nombre: string }>
}

const GeneralDashboard = ({ dictionary }: Props) => {
  const [data, setData] = useState<DashboardData | null>(null)
  const [catalogs, setCatalogs] = useState<CatalogData>({ regions: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState({ year: new Date().getFullYear().toString(), region: '' })
  const [searchKey, setSearchKey] = useState(0)

  const [modalHCDeptOpen, setModalHCDeptOpen] = useState(false)
  const [modalHCHiresOpen, setModalHCHiresOpen] = useState(false)
  const [modalGasMesOpen, setModalGasMesOpen] = useState(false)
  const [modalGasProjOpen, setModalGasProjOpen] = useState(false)
  const [modalFlotillasOpen, setModalFlotillasOpen] = useState(false)
  const [modalProjRespOpen, setModalProjRespOpen] = useState(false)

  const t = (key: string) => {
    return key.split('.').reduce((obj, k) => obj?.[k], dictionary) as unknown as string ?? key
  }

  useEffect(() => {
    const controller = new AbortController()

    const fetchData = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (filters.year) params.set('year', filters.year)
        if (filters.region) params.set('region', filters.region)

        const response = await fetch(`/api/general-dashboard?${params.toString()}`, {
          signal: controller.signal
        })

        if (!response.ok) throw new Error('Failed to fetch dashboard data')

        const result = await response.json()

        setData(result.data)
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchData()

    return () => controller.abort()
  }, [searchKey])

  useEffect(() => {
    const fetchCatalogs = async () => {
      try {
        const res = await fetch('/api/catalogs?type=regions')

        const result = await res.json()

        setCatalogs({ regions: result.data || [] })
      } catch (err) {
        console.error('Failed to fetch catalogs:', err)
      }
    }

    fetchCatalogs()
  }, [])

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }))
  }

  const handleSearch = () => {
    setSearchKey(prev => prev + 1)
  }

  const handleClear = () => {
    setFilters({ year: new Date().getFullYear().toString(), region: '' })
    setSearchKey(prev => prev + 1)
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

  const renderMetricBadges = (badges: Array<{ label: string; value: number | string; color: string; bg: string; icon: string }>) => (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2, justifyContent: 'center' }}>
      {badges.map((badge, idx) => (
        <Box
          key={idx}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 1.5,
            py: 0.75,
            borderRadius: 2,
            background: badge.bg,
            minWidth: 80
          }}
        >
          <i className={badge.icon} style={{ fontSize: '1rem', color: badge.color }} />
          <Box>
            <Typography sx={{ fontSize: '1.1rem', fontWeight: 700, color: '#1f2937', lineHeight: 1 }}>
              {typeof badge.value === 'number' ? badge.value.toLocaleString() : badge.value}
            </Typography>
            <Typography sx={{ fontSize: '0.65rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {badge.label}
            </Typography>
          </Box>
        </Box>
      ))}
    </Box>
  )

  const renderSectionCard = (
    title: string,
    icon: string,
    iconColor: string,
    iconBg: string,
    badges: Array<{ label: string; value: number | string; color: string; bg: string; icon: string }>,
    charts: Array<{
      label: string
      component: React.ReactNode
      modalTitle?: string
      onModalOpen?: () => void
    }>
  ) => (
    <Card sx={{ borderRadius: '16px', border: '1px solid rgba(0,0,0,.06)', boxShadow: '0 2px 12px rgba(15,23,42,.07)', height: '100%' }}>
      <CardContent sx={{ p: '1rem !important' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
          <Box sx={{ width: 40, height: 40, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', background: iconBg, color: iconColor }}>
            <i className={icon} />
          </Box>
          <Typography variant='h6' sx={{ fontSize: '1rem', fontWeight: 700, color: '#1f2937' }}>
            {title}
          </Typography>
        </Box>

        {renderMetricBadges(badges)}

        {charts.map((chart, idx) => (
          <Box key={idx} sx={{ mb: idx < charts.length - 1 ? 2 : 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant='caption' sx={{ color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.65rem' }}>
                {chart.label}
              </Typography>
              {chart.modalTitle && chart.onModalOpen && (
                <IconButton size='small' onClick={chart.onModalOpen} sx={{ color: '#6b7280', p: 0.25 }}>
                  <i className='ri-eye-line' style={{ fontSize: '1rem' }} />
                </IconButton>
              )}
            </Box>
            <Box sx={{ position: 'relative', width: '100%', height: 180 }}>
              {chart.component}
            </Box>
          </Box>
        ))}
      </CardContent>
    </Card>
  )

  return (
    <div>
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: 180,
          backgroundImage: 'url(https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          borderRadius: 16,
          overflow: 'hidden',
          marginBottom: 24,
          boxShadow: '0 8px 32px rgba(15, 23, 42, .18)'
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(135deg, rgba(15, 23, 42, .7) 0%, rgba(13, 110, 253, .45) 100%)'
          }}
        />
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#fff', textAlign: 'center', zIndex: 10, width: '100%' }}>
          <h1 style={{ fontSize: 42, fontWeight: 800, textShadow: '2px 2px 8px rgba(0,0,0,.5)', fontFamily: '"Carter One", system-ui', margin: 0 }}>
            {t('start.heroTitle')}
          </h1>
          <p style={{ fontSize: 18, opacity: 0.9, margin: '4px 0 0' }}>
            {t('start.heroSubtitle')}
          </p>
        </div>
      </div>

      <GeneralFilters t={t} values={filters} onChange={handleFilterChange} onSearch={handleSearch} onClear={handleClear} regions={catalogs.regions} />

      {/* ROW 1 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Capital Humano */}
        <Grid size={{ xs: 12, md: 4 }}>
          {renderSectionCard(
            t('dashboard.general.humanCapital'),
            'ri-user-heart-line',
            '#0d6efd',
            'rgba(13,110,253,.12)',
            [
              { label: t('dashboard.general.active'), value: data.humanCapital.activos, color: '#0d6efd', bg: 'rgba(13,110,253,.08)', icon: 'ri-user-follow-line' },
              { label: t('dashboard.general.inactive'), value: data.humanCapital.inactivos, color: '#6c757d', bg: 'rgba(108,117,125,.08)', icon: 'ri-user-forbidden-line' }
            ],
            [
              {
                label: t('dashboard.general.byDepartment'),
                component: <HumanCapitalDeptChart t={t} data={data.humanCapital.porDepto} />,
                modalTitle: t('dashboard.general.byDepartment'),
                onModalOpen: () => setModalHCDeptOpen(true)
              },
              {
                label: t('dashboard.general.hiresTerminations'),
                component: <HumanCapitalHiresChart t={t} data={data.humanCapital.altasBajas} />,
                modalTitle: t('dashboard.general.hiresTerminations'),
                onModalOpen: () => setModalHCHiresOpen(true)
              }
            ]
          )}
        </Grid>

        {/* Inventario */}
        <Grid size={{ xs: 12, md: 4 }}>
          {renderSectionCard(
            t('dashboard.general.inventory'),
            'ri-server-line',
            '#17a2b8',
            'rgba(23,162,184,.12)',
            [
              { label: t('dashboard.general.totalSites'), value: data.inventario.total, color: '#17a2b8', bg: 'rgba(23,162,184,.08)', icon: 'ri-global-line' },
              { label: t('dashboard.general.totalPallets'), value: data.inventario.palets, color: '#20c997', bg: 'rgba(32,201,151,.08)', icon: 'ri-file-list-3-line' },
              { label: t('dashboard.warehouses.arrivals'), value: data.inventario.arribos, color: '#198754', bg: 'rgba(25,135,84,.08)', icon: 'ri-arrow-down-circle-line' },
              { label: t('dashboard.warehouses.outputs'), value: data.inventario.salidas, color: '#ffc107', bg: 'rgba(255,193,7,.08)', icon: 'ri-arrow-up-circle-line' }
            ],
            [
              {
                label: t('dashboard.general.movementsByMonth'),
                component: <InventoryMovementsChart t={t} data={data.inventario.porMes} />
              }
            ]
          )}
        </Grid>

        {/* Gastos de Operación */}
        <Grid size={{ xs: 12, md: 4 }}>
          {renderSectionCard(
            t('dashboard.general.operatingExpenses'),
            'ri-file-list-2-line',
            '#198754',
            'rgba(25,135,84,.12)',
            [
              { label: t('dashboard.general.total'), value: data.gastos.total, color: '#198754', bg: 'rgba(25,135,84,.08)', icon: 'ri-file-list-line' },
              { label: t('dashboard.general.pending'), value: data.gastos.pendientes, color: '#ffc107', bg: 'rgba(255,193,7,.08)', icon: 'ri-time-line' },
              { label: t('dashboard.general.approved'), value: data.gastos.aceptadas, color: '#0d6efd', bg: 'rgba(13,110,253,.08)', icon: 'ri-checkbox-circle-line' },
              { label: t('dashboard.general.rejected'), value: data.gastos.rechazadas, color: '#dc3545', bg: 'rgba(220,53,69,.08)', icon: 'ri-close-circle-line' }
            ],
            [
              {
                label: t('dashboard.general.requestsByMonth'),
                component: <OperatingExpensesChart t={t} data={data.gastosPorMes} />,
                modalTitle: t('dashboard.general.requestsByMonth'),
                onModalOpen: () => setModalGasMesOpen(true)
              },
              {
                label: t('dashboard.general.expensesByProject'),
                component: <ExpensesByProjectChart t={t} data={data.gastosPorProyecto} />,
                modalTitle: t('dashboard.general.expensesByProject'),
                onModalOpen: () => setModalGasProjOpen(true)
              }
            ]
          )}
        </Grid>
      </Grid>

      {/* ROW 2 */}
      <Grid container spacing={3}>
        {/* Flotillas */}
        <Grid size={{ xs: 12, md: 4 }}>
          {renderSectionCard(
            t('dashboard.general.fleets'),
            'ri-truck-line',
            '#6f42c1',
            'rgba(111,66,193,.12)',
            [
              { label: t('dashboard.general.total'), value: data.flotillas.total, color: '#6f42c1', bg: 'rgba(111,66,193,.08)', icon: 'ri-truck-line' },
              { label: t('dashboard.general.pending'), value: data.flotillas.pendientes, color: '#ffc107', bg: 'rgba(255,193,7,.08)', icon: 'ri-time-line' },
              { label: t('dashboard.general.approved'), value: data.flotillas.aceptadas, color: '#198754', bg: 'rgba(25,135,84,.08)', icon: 'ri-checkbox-circle-line' },
              { label: t('dashboard.general.rejected'), value: data.flotillas.rechazadas, color: '#dc3545', bg: 'rgba(220,53,69,.08)', icon: 'ri-close-circle-line' }
            ],
            [
              {
                label: t('dashboard.general.requestsByMonth'),
                component: <FleetsChart t={t} data={data.flotillas.porMes} />,
                modalTitle: t('dashboard.general.fleets'),
                onModalOpen: () => setModalFlotillasOpen(true)
              }
            ]
          )}
        </Grid>

        {/* Cotizaciones */}
        <Grid size={{ xs: 12, md: 4 }}>
          {renderSectionCard(
            t('dashboard.general.quotes'),
            'ri-file-text-line',
            '#b45309',
            'rgba(255,193,7,.15)',
            [
              { label: t('dashboard.general.total'), value: data.cotizaciones.total, color: '#b45309', bg: 'rgba(255,193,7,.08)', icon: 'ri-file-text-line' },
              { label: t('dashboard.general.pending'), value: data.cotizaciones.pendientes, color: '#ffc107', bg: 'rgba(255,193,7,.08)', icon: 'ri-time-line' },
              { label: t('dashboard.general.approved'), value: data.cotizaciones.aceptadas, color: '#198754', bg: 'rgba(25,135,84,.08)', icon: 'ri-checkbox-circle-line' },
              { label: t('dashboard.general.rejected'), value: data.cotizaciones.rechazadas, color: '#dc3545', bg: 'rgba(220,53,69,.08)', icon: 'ri-close-circle-line' }
            ],
            [
              {
                label: t('dashboard.general.quotes'),
                component: <CotizacionesChart t={t} data={data.cotizaciones} />
              }
            ]
          )}
        </Grid>

        {/* Proyectos */}
        <Grid size={{ xs: 12, md: 4 }}>
          {renderSectionCard(
            t('dashboard.general.projects'),
            'ri-briefcase-line',
            '#0d6efd',
            'rgba(13,110,253,.12)',
            [
              { label: t('dashboard.projects.active'), value: data.proyectos.activos, color: '#198754', bg: 'rgba(25,135,84,.08)', icon: 'ri-briefcase-line' },
              { label: t('dashboard.projects.inactive'), value: data.proyectos.inactivos, color: '#6c757d', bg: 'rgba(108,117,125,.08)', icon: 'ri-close-line' }
            ],
            [
              {
                label: t('dashboard.general.byResponsible'),
                component: <ProjectsResponsibleChart t={t} data={data.proyectos.porResponsable} />,
                modalTitle: t('dashboard.general.byResponsible'),
                onModalOpen: () => setModalProjRespOpen(true)
              },
              {
                label: t('dashboard.general.byMonth'),
                component: <ProjectsByMonthChart t={t} data={data.proyectos.porMes} />
              }
            ]
          )}
        </Grid>
      </Grid>

      {/* Ver Más Modals */}
      <ChartModal open={modalHCDeptOpen} onClose={() => setModalHCDeptOpen(false)} title={t('dashboard.general.byDepartment')}>
        <HumanCapitalDeptChart t={t} data={data.humanCapital.porDepto} height={450} />
      </ChartModal>

      <ChartModal open={modalHCHiresOpen} onClose={() => setModalHCHiresOpen(false)} title={t('dashboard.general.hiresTerminations')}>
        <HumanCapitalHiresChart t={t} data={data.humanCapital.altasBajas} height={450} />
      </ChartModal>

      <ChartModal open={modalGasMesOpen} onClose={() => setModalGasMesOpen(false)} title={t('dashboard.general.requestsByMonth')}>
        <OperatingExpensesChart t={t} data={data.gastosPorMes} height={450} />
      </ChartModal>

      <ChartModal open={modalGasProjOpen} onClose={() => setModalGasProjOpen(false)} title={t('dashboard.general.expensesByProject')}>
        <ExpensesByProjectChart t={t} data={data.gastosPorProyecto} height={450} />
      </ChartModal>

      <ChartModal open={modalFlotillasOpen} onClose={() => setModalFlotillasOpen(false)} title={t('dashboard.general.fleets')}>
        <FleetsChart t={t} data={data.flotillas.porMes} height={450} />
      </ChartModal>

      <ChartModal open={modalProjRespOpen} onClose={() => setModalProjRespOpen(false)} title={t('dashboard.general.byResponsible')}>
        <ProjectsResponsibleChart t={t} data={data.proyectos.porResponsable} height={450} />
      </ChartModal>
    </div>
  )
}

export default GeneralDashboard
