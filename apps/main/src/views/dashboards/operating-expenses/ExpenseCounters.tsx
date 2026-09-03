'use client'

import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid2'
import Typography from '@mui/material/Typography'

import CustomAvatar from '@core/components/mui/Avatar'

type CountersData = {
  total: number
  aceptadas: number
  pendientes: number
  rechazadas: number
  pagadas: number
  montoPagadas: number
}

type Props = {
  t: (key: string) => string
  counters: CountersData
}

const ExpenseCounters = ({ t, counters }: Props) => {
  const items = [
    {
      label: t('dashboard.expenses.totalRequests'),
      value: counters.total,
      color: 'primary' as const,
      icon: 'ri-file-list-2-line'
    },
    {
      label: t('dashboard.expenses.accepted'),
      value: counters.aceptadas,
      color: 'success' as const,
      icon: 'ri-check-line'
    },
    {
      label: t('dashboard.expenses.pending'),
      value: counters.pendientes,
      color: 'warning' as const,
      icon: 'ri-time-line'
    },
    {
      label: t('dashboard.expenses.rejected'),
      value: counters.rechazadas,
      color: 'error' as const,
      icon: 'ri-close-line'
    },
    { label: t('dashboard.expenses.paid'), value: counters.pagadas, color: 'info' as const, icon: 'ri-wallet-line' }
  ]

  return (
    <Card>
      <CardHeader title={t('dashboard.expenses.counters')} />
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
          <Grid size={{ xs: 12 }}>
            <div className='flex items-center gap-3 mt-4'>
              <CustomAvatar variant='rounded' color='success' className='shadow-xs'>
                <i className='ri-money-dollar-circle-line'></i>
              </CustomAvatar>
              <div>
                <Typography variant='body2'>{t('dashboard.expenses.paidAmount')}</Typography>
                <Typography variant='h4'>
                  ${counters.montoPagadas.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </Typography>
              </div>
            </div>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  )
}

export default ExpenseCounters
