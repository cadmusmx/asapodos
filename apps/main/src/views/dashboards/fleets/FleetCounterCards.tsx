'use client'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Grid from '@mui/material/Grid2'

type CountersData = {
  total: number
  active: number
  inactive: number
  totalKms: number
  totalFuel: number
}

type Props = {
  t: (key: string) => string
  counters: CountersData
}

const FleetCounterCards = ({ t, counters }: Props) => {
  const items = [
    {
      label: t('dashboard.fleets.totalVehicles'),
      value: counters.total,
      color: 'var(--mui-palette-primary-main)',
      iconBg: 'rgba(var(--mui-palette-primary-mainChannel) / 0.12)',
      icon: 'ri-truck-line'
    },
    {
      label: t('dashboard.fleets.active'),
      value: counters.active,
      color: 'var(--mui-palette-success-main)',
      iconBg: 'rgba(var(--mui-palette-success-mainChannel) / 0.12)',
      icon: 'ri-checkbox-circle-line'
    },
    {
      label: t('dashboard.fleets.inactive'),
      value: counters.inactive,
      color: 'var(--mui-palette-text-secondary)',
      iconBg: 'rgba(var(--mui-palette-grey-500Channel) / 0.12)',
      icon: 'ri-close-line'
    },
    {
      label: t('dashboard.fleets.totalKms'),
      value: counters.totalKms.toLocaleString(),
      color: 'var(--mui-palette-info-main)',
      iconBg: 'rgba(var(--mui-palette-info-mainChannel) / 0.12)',
      icon: 'ri-gauge-line'
    },
    {
      label: t('dashboard.fleets.totalFuel'),
      value: `$${counters.totalFuel.toLocaleString()}`,
      color: 'var(--mui-palette-warning-main)',
      iconBg: 'rgba(var(--mui-palette-warning-mainChannel) / 0.25)',
      icon: 'ri-flashlight-line'
    }
  ]

  return (
    <Grid container spacing={2}>
      {items.map((item, index) => (
        <Grid size={{ xs: 6, md: 2.4 }} key={index}>
          <Card
            sx={{
              borderRadius: '16px',
              border: '1px solid var(--mui-palette-divider)',
              borderTop: `3px solid ${item.color}`,
              transition: 'transform .2s',
              height: '100%',
              '&:hover': {
                transform: 'translateY(-3px)'
              }
            }}
          >
            <CardContent sx={{ p: '1rem !important', textAlign: 'center' }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                  background: item.iconBg,
                  color: item.color,
                  margin: '0 auto 0.5rem'
                }}
              >
                <i className={item.icon} />
              </div>
              <Typography variant='h5' sx={{ fontWeight: 700, color: 'var(--mui-palette-text-primary)' }}>
                {typeof item.value === 'number' ? item.value.toLocaleString() : item.value}
              </Typography>
              <Typography variant='body2' color='text.secondary' sx={{ fontSize: '0.8rem' }}>
                {item.label}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  )
}

export default FleetCounterCards
