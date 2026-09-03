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
    {
      label: t('dashboard.humanCapital.totalEmployees'),
      value: counters.totalEmpleados,
      color: 'primary',
      icon: 'fa-solid fa-users',
      id: 'cntTotalEmp'
    },
    {
      label: t('dashboard.humanCapital.active'),
      value: counters.totalActivos,
      color: 'success',
      icon: 'fa-solid fa-user-check',
      id: 'cntActivos'
    },
    {
      label: t('dashboard.humanCapital.inactive'),
      value: counters.totalInactivos,
      color: 'error',
      icon: 'fa-solid fa-user-slash',
      id: 'cntInactivos'
    },
    {
      label: t('dashboard.humanCapital.hiresYear'),
      value: counters.totalAltas,
      color: 'info',
      icon: 'fa-solid fa-user-plus',
      id: 'cntAltas'
    },
    {
      label: t('dashboard.humanCapital.terminationsYear'),
      value: counters.totalBajas,
      color: 'warning',
      icon: 'fa-solid fa-user-minus',
      id: 'cntBajas'
    }
  ]

  const colorMap: Record<string, string> = {
    primary: 'rgba(var(--mui-palette-primary-mainChannel) / 0.12)',
    success: 'rgba(var(--mui-palette-success-mainChannel) / 0.12)',
    error: 'rgba(var(--mui-palette-error-mainChannel) / 0.12)',
    warning: 'rgba(var(--mui-palette-warning-mainChannel) / 0.15)',
    info: 'rgba(var(--mui-palette-info-mainChannel) / 0.12)'
  }

  const iconColorMap: Record<string, string> = {
    primary: 'var(--mui-palette-primary-main)',
    success: 'var(--mui-palette-success-main)',
    error: 'var(--mui-palette-error-main)',
    warning: 'var(--mui-palette-warning-main)',
    info: 'var(--mui-palette-info-main)'
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
              border: '1px solid var(--mui-palette-divider)',
              transition: 'transform .22s ease',
              '&:hover': {
                transform: 'translateY(-3px)'
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
                sx={{ fontWeight: 800, color: 'var(--mui-palette-text-primary)', fontSize: '1rem', mb: 0.35 }}
              >
                {item.label}
              </Typography>
              <Typography
                variant='h4'
                sx={{
                  fontWeight: 900,
                  color: 'var(--mui-palette-text-primary)',
                  lineHeight: 1.05,
                  display: 'block',
                  mb: 0.25,
                  fontSize: '2rem'
                }}
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
