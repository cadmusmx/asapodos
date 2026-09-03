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
    activos: number
    inactivos: number
  }
}

const ProjectsCard = ({ t, data }: Props) => {
  return (
    <Card>
      <CardHeader
        title={t('dashboard.general.projects')}
        action={<OptionsMenu iconClassName='text-textPrimary' options={['Refresh', 'Update']} />}
      />
      <CardContent>
        <Grid container spacing={2}>
          <Grid size={{ xs: 4 }}>
            <div className='flex items-center gap-3'>
              <CustomAvatar variant='rounded' color='primary' className='shadow-xs'>
                <i className='ri-briefcase-line' />
              </CustomAvatar>
              <div>
                <Typography variant='h5'>{data.total}</Typography>
                <Typography variant='body2' color='text.secondary'>
                  {t('dashboard.general.total')}
                </Typography>
              </div>
            </div>
          </Grid>
          <Grid size={{ xs: 4 }}>
            <div className='flex items-center gap-3'>
              <CustomAvatar variant='rounded' color='success' className='shadow-xs'>
                <i className='ri-checkbox-circle-line' />
              </CustomAvatar>
              <div>
                <Typography variant='h5'>{data.activos}</Typography>
                <Typography variant='body2' color='text.secondary'>
                  {t('dashboard.general.active')}
                </Typography>
              </div>
            </div>
          </Grid>
          <Grid size={{ xs: 4 }}>
            <div className='flex items-center gap-3'>
              <CustomAvatar variant='rounded' color='warning' className='shadow-xs'>
                <i className='ri-time-line' />
              </CustomAvatar>
              <div>
                <Typography variant='h5'>{data.inactivos}</Typography>
                <Typography variant='body2' color='text.secondary'>
                  {t('dashboard.general.inactive')}
                </Typography>
              </div>
            </div>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  )
}

export default ProjectsCard
