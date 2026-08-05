'use client'

import dynamic from 'next/dynamic'

import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid2'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'
import type { ApexOptions } from 'apexcharts'

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
  chartData: Array<{ mes: string; aceptadas: number; rechazadas: number; pagadas: number }>
}

const OperatingExpensesCard = ({ t, data, chartData }: Props) => {
  const theme = useTheme()

  const months = chartData.map(d => d.mes)
  const aceptadas = chartData.map(d => d.aceptadas)
  const rechazadas = chartData.map(d => d.rechazadas)

  const options: ApexOptions = {
    chart: {
      parentHeightOffset: 0,
      toolbar: { show: false }
    },
    plotOptions: {
      bar: {
        borderRadius: 4,
        columnWidth: '40%'
      }
    },
    stroke: {
      width: 0
    },
    legend: { show: false },
    grid: {
      xaxis: { lines: { show: false } },
      strokeDashArray: 7,
      padding: { left: -9, top: -20, bottom: 13 },
      borderColor: 'var(--mui-palette-divider)'
    },
    dataLabels: { enabled: false },
    colors: ['var(--mui-palette-success-main)', 'var(--mui-palette-error-main)'],
    xaxis: {
      categories: months,
      tickPlacement: 'on',
      labels: { show: false },
      axisTicks: { show: false },
      axisBorder: { show: false }
    },
    yaxis: {
      show: true,
      tickAmount: 3,
      labels: {
        offsetY: 2,
        offsetX: -17,
        style: { colors: 'var(--mui-palette-text-disabled)', fontSize: theme.typography.body2.fontSize as string }
      }
    }
  }

  return (
    <Card>
      <CardHeader
        title={t('dashboard.general.operatingExpenses')}
        action={<OptionsMenu iconClassName='text-textPrimary' options={['Refresh', 'Update']} />}
      />
      <CardContent>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 6, md: 3 }}>
            <div className='flex items-center gap-3'>
              <CustomAvatar variant='rounded' color='primary' className='shadow-xs'>
                <i className='ri-file-list-2-line' />
              </CustomAvatar>
              <div>
                <Typography variant='h5'>{data.total}</Typography>
                <Typography variant='body2' color='text.secondary'>{t('dashboard.general.total')}</Typography>
              </div>
            </div>
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <div className='flex items-center gap-3'>
              <CustomAvatar variant='rounded' color='success' className='shadow-xs'>
                <i className='ri-check-line' />
              </CustomAvatar>
              <div>
                <Typography variant='h5'>{data.aceptadas}</Typography>
                <Typography variant='body2' color='text.secondary'>{t('dashboard.general.approved')}</Typography>
              </div>
            </div>
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <div className='flex items-center gap-3'>
              <CustomAvatar variant='rounded' color='warning' className='shadow-xs'>
                <i className='ri-time-line' />
              </CustomAvatar>
              <div>
                <Typography variant='h5'>{data.pendientes}</Typography>
                <Typography variant='body2' color='text.secondary'>{t('dashboard.general.pending')}</Typography>
              </div>
            </div>
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <div className='flex items-center gap-3'>
              <CustomAvatar variant='rounded' color='error' className='shadow-xs'>
                <i className='ri-close-line' />
              </CustomAvatar>
              <div>
                <Typography variant='h5'>{data.rechazadas}</Typography>
                <Typography variant='body2' color='text.secondary'>{t('dashboard.general.rejected')}</Typography>
              </div>
            </div>
          </Grid>
        </Grid>
        <AppReactApexCharts
          type='bar'
          height={150}
          width='100%'
          series={[
            { name: t('dashboard.general.approved'), data: aceptadas },
            { name: t('dashboard.general.rejected'), data: rechazadas }
          ]}
          options={options}
        />
      </CardContent>
    </Card>
  )
}

export default OperatingExpensesCard
