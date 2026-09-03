'use client'

import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid2'
import Typography from '@mui/material/Typography'

import CustomAvatar from '@core/components/mui/Avatar'

type CountersData = {
  total: number
  activos: number
  inactivos: number
}

type Props = {
  t: (key: string) => string
  counters: CountersData
}

const ProjectCounters = ({ t, counters }: Props) => {
  const items = [
    {
      label: t('dashboard.projects.totalProjects'),
      value: counters.total,
      color: 'primary' as const,
      icon: 'ri-briefcase-line'
    },
    {
      label: t('dashboard.projects.active'),
      value: counters.activos,
      color: 'success' as const,
      icon: 'ri-checkbox-circle-line'
    },
    {
      label: t('dashboard.projects.pending'),
      value: counters.inactivos,
      color: 'warning' as const,
      icon: 'ri-time-line'
    }
  ]

  return (
    <Card>
      <CardHeader title={t('dashboard.projects.counters')} />
      <CardContent>
        <Grid container spacing={2}>
          {items.map((item, index) => (
            <Grid size={{ xs: 6, md: 4 }} key={index}>
              <div className='flex items-center gap-3'>
                <CustomAvatar variant='rounded' color={item.color} className='shadow-xs'>
                  <i className={item.icon}></i>
                </CustomAvatar>
                <div>
                  <Typography variant='body2'>{item.label}</Typography>
                  <Typography variant='h5'>{item.value.toLocaleString()}</Typography>
                </div>
              </div>
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  )
}

export default ProjectCounters
