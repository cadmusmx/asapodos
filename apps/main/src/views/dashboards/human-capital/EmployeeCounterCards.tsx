'use client'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid2'
import Typography from '@mui/material/Typography'
import FontAwesomeIconComponent from '@views/dashboards/components/FontAwesomeIcon'

type CountersData = {
  totalEmpleados: number
  totalActivos: number
  totalInactivos: number
  totalAltas: number
  totalBajas: number
}

type Props = {
  t: (key: string) => string
  counters: CountersData
}

const EmployeeCounterCards = ({ t, counters }: Props) => {
  const items = [
    { label: t('dashboard.humanCapital.totalEmployees'), value: counters.totalEmpleados, color: 'primary', icon: 'fa-solid fa-users', id: 'cntTotalEmp' },
    { label: t('dashboard.humanCapital.active'), value: counters.totalActivos, color: 'success', icon: 'fa-solid fa-user-check', id: 'cntActivos' },
    { label: t('dashboard.humanCapital.inactive'), value: counters.totalInactivos, color: 'error', icon: 'fa-solid fa-user-slash', id: 'cntInactivos' },
    { label: t('dashboard.humanCapital.hiresYear'), value: counters.totalAltas, color: 'info', icon: 'fa-solid fa-user-plus', id: 'cntAltas' },
    { label: t('dashboard.humanCapital.terminationsYear'), value: counters.totalBajas, color: 'warning', icon: 'fa-solid fa-user-minus', id: 'cntBajas' }
  ]

  const colorMap: Record<string, string> = {
    primary: 'rgba(13,110,253,.12)',
    success: 'rgba(25,135,84,.12)',
    error: 'rgba(220,53,69,.12)',
    warning: 'rgba(255,193,7,.15)',
    info: 'rgba(32,201,151,.12)'
  }

  const iconColorMap: Record<string, string> = {
    primary: '#0d6efd',
    success: '#198754',
    error: '#dc3545',
    warning: '#b45309',
    info: '#20c997'
  }

  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      {items.map((item, index) => (
        <Grid size={{ xs: 6, md: 2.4 }} key={index}>
          <Card
            sx={{
              textAlign: 'center',
              p: 2,
              borderRadius: '20px',
              border: '1px solid #e5e7eb',
              boxShadow: '0 6px 18px rgba(15,23,42,.08)',
              transition: 'transform .22s ease, box-shadow .22s ease',
              '&:hover': {
                transform: 'translateY(-3px)',
                boxShadow: '0 12px 24px rgba(15,23,42,.10)'
              }
            }}
          >
            <CardContent sx={{ p: '1rem .9rem !important', '&:last-child': { pb: '1rem !important' } }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.15rem',
                  marginBottom: '0.8rem',
                  background: colorMap[item.color],
                  color: iconColorMap[item.color]
                }}
              >
                <FontAwesomeIconComponent icon={item.icon} style={{ width: 20, height: 20 }} />
              </div>
              <Typography
                variant='h6'
                sx={{ fontWeight: 800, color: '#1f2937', fontSize: '1rem', mb: 0.35 }}
              >
                {item.label}
              </Typography>
              <Typography
                variant='h4'
                sx={{ fontWeight: 900, color: '#0f172a', lineHeight: 1.05, display: 'block', mb: 0.25, fontSize: '2rem' }}
              >
                {item.value.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  )
}

export default EmployeeCounterCards
