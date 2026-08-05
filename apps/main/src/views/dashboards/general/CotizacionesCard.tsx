'use client'

import dynamic from 'next/dynamic'

import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid2'
import Typography from '@mui/material/Typography'

import CustomAvatar from '@core/components/mui/Avatar'
import OptionsMenu from '@core/components/option-menu'

const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'))

type Props = {
  t: (key: string) => string
  data: {
    total: number
    aceptadas: number
    pendientes: number
    rechazadas: number
  }
}

const CotizacionesCard = ({ t, data }: Props) => {
  const options = {
    chart: {
      sparkline: { enabled: true }
    },
    colors: [
      'var(--mui-palette-success-main)',
      'var(--mui-palette-warning-main)',
      'var(--mui-palette-error-main)'
    ],
    stroke: { width: 3, colors: ['var(--mui-palette-background-paper)'] },
    legend: { show: false },
    tooltip: {
      custom: ({ series, seriesIndex, w }) => {
        const label = w.globals.labels[seriesIndex] as string
        const value = series[seriesIndex] as number
        const total = (series as number[]).reduce((a, b) => a + b, 0)
        const pct = ((value / total) * 100).toFixed(1)
        return `<div style="padding:8px 12px;background:var(--mui-palette-background-paper);color:var(--mui-palette-text-primary);border-radius:8px;font-size:13px;border:1px solid var(--mui-palette-divider);">
          <strong>${label}</strong><br/>
          ${value.toLocaleString()} (${pct}%)
        </div>`
      }
    },
    dataLabels: { enabled: false },
    labels: [t('dashboard.general.approved'), t('dashboard.general.pending'), t('dashboard.general.rejected')],
    states: {
      hover: { filter: { type: 'none' } },
      active: { filter: { type: 'none' } }
    },
    plotOptions: {
      pie: {
        customScale: 0.9,
        donut: {
          size: '75%'
        }
      }
    }
  }

  return (
    <Card>
      <CardHeader
        title={t('dashboard.general.quotes')}
        action={<OptionsMenu iconClassName='text-textPrimary' options={['Refresh', 'Update']} />}
      />
      <CardContent>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, sm: 5 }}>
            <div className='flex items-center gap-3 mb-3'>
              <CustomAvatar variant='rounded' color='primary' className='shadow-xs'>
                <i className='ri-file-text-line' />
              </CustomAvatar>
              <div>
                <Typography variant='h4'>{data.total}</Typography>
                <Typography variant='body2' color='text.secondary'>{t('dashboard.general.total')}</Typography>
              </div>
            </div>
            <Grid container spacing={1}>
              <Grid size={{ xs: 4 }}>
                <Typography variant='h6' color='success.main'>{data.aceptadas}</Typography>
                <Typography variant='caption' color='text.secondary'>{t('dashboard.general.approved')}</Typography>
              </Grid>
              <Grid size={{ xs: 4 }}>
                <Typography variant='h6' color='warning.main'>{data.pendientes}</Typography>
                <Typography variant='caption' color='text.secondary'>{t('dashboard.general.pending')}</Typography>
              </Grid>
              <Grid size={{ xs: 4 }}>
                <Typography variant='h6' color='error.main'>{data.rechazadas}</Typography>
                <Typography variant='caption' color='text.secondary'>{t('dashboard.general.rejected')}</Typography>
              </Grid>
            </Grid>
          </Grid>
          <Grid size={{ xs: 12, sm: 7 }}>
            <AppReactApexCharts
              type='donut'
              height={140}
              width='100%'
              series={[data.aceptadas, data.pendientes, data.rechazadas]}
              options={options}
            />
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  )
}

export default CotizacionesCard
