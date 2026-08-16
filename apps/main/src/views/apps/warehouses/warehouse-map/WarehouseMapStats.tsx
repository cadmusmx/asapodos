'use client'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Grid from '@mui/material/Grid2'
import Skeleton from '@mui/material/Skeleton'

import type { MapStatistics } from '@/types/warehouse-map'

type Props = {
  statistics: MapStatistics | null
  isLoading: boolean
  t: (key: string) => string
}

const WarehouseMapStats = ({ statistics, isLoading, t }: Props) => {
  const items = [
    {
      label: t('navigation.warehouses.warehouseMapStats.totalWarehouses'),
      value: statistics?.total ?? 0,
      color: 'var(--mui-palette-primary-main)',
      iconBg: 'rgba(var(--mui-palette-primary-mainChannel) / 0.12)',
      icon: 'ri-store-2-line',
      unit: ''
    },
    {
      label: t('navigation.warehouses.warehouseMapStats.operativeWarehouses'),
      value: statistics?.operativos ?? 0,
      color: 'var(--mui-palette-success-main)',
      iconBg: 'rgba(var(--mui-palette-success-mainChannel) / 0.12)',
      icon: 'ri-checkbox-circle-line',
      unit: ''
    },
    {
      label: t('navigation.warehouses.warehouseMapStats.totalCapacity'),
      value: (statistics?.capacidadTotal ?? 0).toLocaleString(),
      color: 'var(--mui-palette-info-main)',
      iconBg: 'rgba(var(--mui-palette-info-mainChannel) / 0.12)',
      icon: 'ri-expand-width-line',
      unit: ' m²'
    },
    {
      label: t('navigation.warehouses.warehouseMapStats.occupiedCapacity'),
      value: (statistics?.capacidadOcupada ?? 0).toLocaleString(),
      color: 'var(--mui-palette-warning-main)',
      iconBg: 'rgba(var(--mui-palette-warning-mainChannel) / 0.25)',
      icon: 'ri-bar-chart-box-line',
      unit: ' m²'
    }
  ]

  return (
    <Grid container spacing={2}>
      {items.map((item, index) => (
        <Grid size={{ xs: 6, md: 3 }} key={index}>
          <Card
            sx={{
              borderRadius: '16px',
              border: '1px solid var(--mui-palette-divider)',
              borderTop: `3px solid ${item.color}`,
              transition: 'transform .2s',
              height: '100%',
              '&:hover': { transform: 'translateY(-3px)' }
            }}
          >
            <CardContent sx={{ p: '1rem !important', textAlign: 'center' }}>
              {isLoading ? (
                <>
                  <Skeleton variant='circular' width={48} height={48} sx={{ mx: 'auto', mb: 1 }} />
                  <Skeleton variant='text' width='80%' sx={{ mx: 'auto' }} />
                  <Skeleton variant='text' width='60%' sx={{ mx: 'auto' }} />
                </>
              ) : (
                <>
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
                  <Typography
                    variant='h5'
                    sx={{ fontWeight: 700, color: 'var(--mui-palette-text-primary)' }}
                  >
                    {item.value}{item.unit}
                  </Typography>
                  <Typography variant='body2' color='text.secondary' sx={{ fontSize: '0.8rem' }}>
                    {item.label}
                  </Typography>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  )
}

export default WarehouseMapStats
