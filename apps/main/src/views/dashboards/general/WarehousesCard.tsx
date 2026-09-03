'use client'

import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import LinearProgress from '@mui/material/LinearProgress'
import Typography from '@mui/material/Typography'

import CustomAvatar from '@core/components/mui/Avatar'
import OptionsMenu from '@core/components/option-menu'

type Props = {
  t: (key: string) => string
  data: {
    total: number
    capacidad: number
    ocupada: number
  }
}

const WarehousesCard = ({ t, data }: Props) => {
  const ocupacionPct = data.capacidad > 0 ? Math.round((data.ocupada / data.capacidad) * 100) : 0

  return (
    <Card>
      <CardHeader
        title={t('navigation.dashboards.warehouses')}
        action={<OptionsMenu iconClassName='text-textPrimary' options={['Refresh', 'Update']} />}
      />
      <CardContent>
        <div className='flex items-center gap-3 mb-4'>
          <CustomAvatar variant='rounded' color='primary' className='shadow-xs'>
            <i className='ri-store-2-line' />
          </CustomAvatar>
          <div>
            <Typography variant='h5'>{data.total}</Typography>
            <Typography variant='body2' color='text.secondary'>
              {t('dashboard.warehouses.totalWarehouses')}
            </Typography>
          </div>
        </div>
        <div className='flex items-center gap-3 mb-2'>
          <CustomAvatar variant='rounded' color='success' className='shadow-xs'>
            <i className='ri-expand-width-line' />
          </CustomAvatar>
          <div>
            <Typography variant='h5'>{data.capacidad.toLocaleString()} m²</Typography>
            <Typography variant='body2' color='text.secondary'>
              {t('dashboard.warehouses.totalCapacity')}
            </Typography>
          </div>
        </div>
        <div className='flex items-center justify-between mb-2'>
          <Typography variant='body2'>{t('dashboard.warehouses.occupancyRate')}</Typography>
          <Typography variant='h5'>{ocupacionPct}%</Typography>
        </div>
        <LinearProgress
          variant='determinate'
          value={ocupacionPct}
          color={ocupacionPct >= 80 ? 'error' : ocupacionPct >= 65 ? 'warning' : 'primary'}
          sx={{ height: 8, borderRadius: 4 }}
        />
        <div className='flex justify-between mt-1'>
          <Typography variant='caption' color='text.secondary'>
            {data.ocupada.toLocaleString()} m² {t('dashboard.warehouses.occupied')}
          </Typography>
          <Typography variant='caption' color='text.secondary'>
            {(data.capacidad - data.ocupada).toLocaleString()} m² {t('dashboard.warehouses.available')}
          </Typography>
        </div>
      </CardContent>
    </Card>
  )
}

export default WarehousesCard
