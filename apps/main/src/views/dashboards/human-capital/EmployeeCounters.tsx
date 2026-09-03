'use client'

import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Grid from '@mui/material/Grid2'

import CustomAvatar from '@core/components/mui/Avatar'

type CountersData = {
  totalEmpleados: number
  totalActivos: number
  totalInactivos: number
  totalAltas: number
  totalBajas: number
}

type Props = {
  t: (key: string) => string
  counters: CountersData
}

const EmployeeCounters = ({ t, counters }: Props) => {
  const items = [
    {
      label: t('dashboard_rh.totalEmployees'),
      value: counters.totalEmpleados,
      color: 'primary' as const,
      icon: 'ri-user-line'
    },
    {
      label: t('dashboard_rh.active'),
      value: counters.totalActivos,
      color: 'success' as const,
      icon: 'ri-user-follow-line'
    },
    {
      label: t('dashboard_rh.inactive'),
      value: counters.totalInactivos,
      color: 'warning' as const,
      icon: 'ri-user-unfollow-line'
    },
    {
      label: t('dashboard_rh.hiresYear'),
      value: counters.totalAltas,
      color: 'info' as const,
      icon: 'ri-user-add-line'
    },
    {
      label: t('dashboard_rh.terminationsYear'),
      value: counters.totalBajas,
      color: 'error' as const,
      icon: 'ri-user-forbidden-line'
    }
  ]

  return (
    <Card>
      <CardHeader title={t('dashboard_rh.employeeCounters')} />
      <CardContent>
        <Grid container spacing={2}>
          {items.map((item, index) => (
            <Grid size={{ xs: 6, md: 2.4 }} key={index}>
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

export default EmployeeCounters
