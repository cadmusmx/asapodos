'use client'

import dynamic from 'next/dynamic'

import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid2'
import Typography from '@mui/material/Typography'
import type { ApexOptions } from 'apexcharts'

import CustomAvatar from '@core/components/mui/Avatar'
import OptionsMenu from '@core/components/option-menu'

const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'))

type Props = {
  t: (key: string) => string
  data: {
    activos: number
    inactivos: number
    porDepto: Array<{ key: string; count: number }>
  }
}

const HumanCapitalCard = ({ t, data }: Props) => {
  const options: ApexOptions = {
    chart: {
      sparkline: { enabled: true }
    },
    colors: ['var(--mui-palette-primary-main)', 'rgba(var(--mui-palette-primary-mainChannel) / 0.7)'],
    stroke: { width: 0 },
    legend: { show: false },
    tooltip: { theme: 'false' },
    dataLabels: { enabled: false },
    labels: [t('dashboard.general.active'), t('dashboard.general.inactive')],
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
        title={t('dashboard.general.humanCapital')}
        action={<OptionsMenu iconClassName='text-textPrimary' options={['Refresh', 'Update']} />}
      />
      <CardContent>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, sm: 4 }} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <CustomAvatar variant='rounded' color='primary' className='shadow-xs'>
              <i className='ri-user-heart-line' />
            </CustomAvatar>
            <div>
              <Typography variant='h4'>{data.activos}</Typography>
              <Typography variant='body2' color='text.secondary'>{t('dashboard.general.active')}</Typography>
            </div>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <CustomAvatar variant='rounded' color='warning' className='shadow-xs'>
              <i className='ri-user-forbidden-line' />
            </CustomAvatar>
            <div>
              <Typography variant='h4'>{data.inactivos}</Typography>
              <Typography variant='body2' color='text.secondary'>{t('dashboard.general.inactive')}</Typography>
            </div>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <AppReactApexCharts
              type='donut'
              height={120}
              width='100%'
              series={[data.activos, data.inactivos]}
              options={options}
            />
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  )
}

export default HumanCapitalCard
