'use client'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Grid from '@mui/material/Grid2'

type CountersData = {
  totalAlmacenes: number
  operativos: number
  capacidadTotal: number
  espacioOcupado: number
  espacioDisponible: number
  ocupacionPorcentaje: number
}

type Props = {
  t: (key: string) => string
  counters: CountersData
}

const WarehouseCounterCards = ({ t, counters }: Props) => {
  const items = [
    {
      label: t('dashboard.warehouses.totalWarehouses'),
      value: counters.totalAlmacenes,
      color: 'var(--mui-palette-primary-main)',
      iconBg: 'rgba(var(--mui-palette-primary-mainChannel) / 0.12)',
      icon: 'ri-store-2-line'
    },
    {
      label: t('dashboard.warehouses.operational'),
      value: counters.operativos,
      color: 'var(--mui-palette-success-main)',
      iconBg: 'rgba(var(--mui-palette-success-mainChannel) / 0.12)',
      icon: 'ri-checkbox-circle-line'
    },
    {
      label: t('dashboard.warehouses.totalCapacity'),
      value: `${counters.capacidadTotal.toLocaleString()} m²`,
      color: 'var(--mui-palette-info-main)',
      iconBg: 'rgba(var(--mui-palette-info-mainChannel) / 0.12)',
      icon: 'ri-expand-width-line'
    },
    {
      label: t('dashboard.warehouses.occupiedSpace'),
      value: `${counters.espacioOcupado.toLocaleString()} m²`,
      color: 'var(--mui-palette-warning-main)',
      iconBg: 'rgba(var(--mui-palette-warning-mainChannel) / 0.25)',
      icon: 'ri-bar-chart-box-line'
    },
    {
      label: t('dashboard.warehouses.availableSpace'),
      value: `${counters.espacioDisponible.toLocaleString()} m²`,
      color: 'var(--mui-palette-info-main)',
      iconBg: 'rgba(var(--mui-palette-info-mainChannel) / 0.12)',
      icon: 'ri-file-chart-line'
    },
    {
      label: t('dashboard.warehouses.occupancyRate'),
      value: `${counters.ocupacionPorcentaje}%`,
      color: counters.ocupacionPorcentaje >= 80 ? 'var(--mui-palette-error-main)' : 'var(--mui-palette-secondary-main)',
      iconBg: counters.ocupacionPorcentaje >= 80 ? 'rgba(var(--mui-palette-error-mainChannel) / 0.12)' : 'rgba(var(--mui-palette-secondary-mainChannel) / 0.12)',
      icon: 'ri-pie-chart-2-line'
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

export default WarehouseCounterCards
