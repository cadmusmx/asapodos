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
      color: '#0d6efd',
      iconBg: 'rgba(13,110,253,.12)',
      icon: 'ri-store-2-line'
    },
    {
      label: t('dashboard.warehouses.operational'),
      value: counters.operativos,
      color: '#28a745',
      iconBg: 'rgba(40,167,69,.12)',
      icon: 'ri-checkbox-circle-line'
    },
    {
      label: t('dashboard.warehouses.totalCapacity'),
      value: `${counters.capacidadTotal.toLocaleString()} m²`,
      color: '#17a2b8',
      iconBg: 'rgba(23,162,184,.12)',
      icon: 'ri-expand-width-line'
    },
    {
      label: t('dashboard.warehouses.occupiedSpace'),
      value: `${counters.espacioOcupado.toLocaleString()} m²`,
      color: '#b45309',
      iconBg: 'rgba(255,193,7,.25)',
      icon: 'ri-bar-chart-box-line'
    },
    {
      label: t('dashboard.warehouses.availableSpace'),
      value: `${counters.espacioDisponible.toLocaleString()} m²`,
      color: '#20c997',
      iconBg: 'rgba(32,201,151,.12)',
      icon: 'ri-file-chart-line'
    },
    {
      label: t('dashboard.warehouses.occupancyRate'),
      value: `${counters.ocupacionPorcentaje}%`,
      color: counters.ocupacionPorcentaje >= 80 ? '#dc3545' : '#6f42c1',
      iconBg: counters.ocupacionPorcentaje >= 80 ? 'rgba(220,53,69,.12)' : 'rgba(111,66,193,.12)',
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
              border: '1px solid rgba(0,0,0,.06)',
              boxShadow: '0 2px 12px rgba(15,23,42,.07)',
              borderTop: `3px solid ${item.color}`,
              transition: 'box-shadow .2s, transform .2s',
              height: '100%',
              '&:hover': {
                boxShadow: '0 8px 28px rgba(13,110,253,.14)',
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
              <Typography variant='h5' sx={{ fontWeight: 700, color: '#1f2937' }}>
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
