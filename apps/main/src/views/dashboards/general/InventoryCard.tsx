'use client'

import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid2'
import Typography from '@mui/material/Typography'

import CustomAvatar from '@core/components/mui/Avatar'
import OptionsMenu from '@core/components/option-menu'

type Props = {
  t: (key: string) => string
  data: {
    total: number
    palets: number
    arribos: number
    salidas: number
  }
}

const InventoryCard = ({ t, data }: Props) => {
  return (
    <Card>
      <CardHeader
        title={t('dashboard.general.inventory')}
        action={<OptionsMenu iconClassName='text-textPrimary' options={['Refresh', 'Update']} />}
      />
      <CardContent>
        <Grid container spacing={2}>
          <Grid size={{ xs: 6, md: 3 }}>
            <div className='flex items-center gap-3'>
              <CustomAvatar variant='rounded' color='info' className='shadow-xs'>
                <i className='ri-server-line' />
              </CustomAvatar>
              <div>
                <Typography variant='h5'>{data.total.toLocaleString()}</Typography>
                <Typography variant='body2' color='text.secondary'>{t('dashboard.general.totalSites')}</Typography>
              </div>
            </div>
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <div className='flex items-center gap-3'>
              <CustomAvatar variant='rounded' color='primary' className='shadow-xs'>
                <i className='ri-file-list-3-line' />
              </CustomAvatar>
              <div>
                <Typography variant='h5'>{data.palets.toLocaleString()}</Typography>
                <Typography variant='body2' color='text.secondary'>{t('dashboard.general.totalPallets')}</Typography>
              </div>
            </div>
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <div className='flex items-center gap-3'>
              <CustomAvatar variant='rounded' color='success' className='shadow-xs'>
                <i className='ri-logout-box-r-line' />
              </CustomAvatar>
              <div>
                <Typography variant='h5'>{data.arribos}</Typography>
                <Typography variant='body2' color='text.secondary'>{t('dashboard.general.arrivals')}</Typography>
              </div>
            </div>
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <div className='flex items-center gap-3'>
              <CustomAvatar variant='rounded' color='warning' className='shadow-xs'>
                <i className='ri-login-box-r-line' />
              </CustomAvatar>
              <div>
                <Typography variant='h5'>{data.salidas}</Typography>
                <Typography variant='body2' color='text.secondary'>{t('dashboard.general.departures')}</Typography>
              </div>
            </div>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  )
}

export default InventoryCard
