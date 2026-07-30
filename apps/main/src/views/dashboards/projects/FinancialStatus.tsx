'use client'

import Grid from '@mui/material/Grid2'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Box from '@mui/material/Box'

type ProjectItem = {
  id: number
  nombre: string
  presupuesto: number
  gasto: number
  porcentaje?: number
  estado?: 'onBudget' | 'exceeding' | 'exceeded'
}

type Props = {
  t: (key: string) => string
  data: ProjectItem[]
}

const FinancialStatus = ({ t, data }: Props) => {
  const statusConfig = {
    onBudget: { color: 'success' as const, label: t('dashboard.projects.onBudget'), dotColor: '#198754' },
    exceeding: { color: 'warning' as const, label: t('dashboard.projects.exceeding'), dotColor: '#ffc107' },
    exceeded: { color: 'error' as const, label: t('dashboard.projects.exceeded'), dotColor: '#dc3545' }
  }

  const getItemsByStatus = (status: 'onBudget' | 'exceeding' | 'exceeded') => {
    return data.filter(p => p.estado === status).slice(0, 5)
  }

  const formatCurrency = (value: number) => {
    return `$${value.toLocaleString('es-MX', { maximumFractionDigits: 0 })}`
  }

  return (
    <Grid container spacing={4}>
      {(['onBudget', 'exceeding', 'exceeded'] as const).map(status => {
        const config = statusConfig[status]
        const items = getItemsByStatus(status)

        return (
          <Grid size={{ xs: 12, md: 4 }} key={status}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <Box
                sx={{
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  background: config.dotColor,
                  boxShadow: `0 0 8px ${config.dotColor}80`
                }}
              />
              <Typography variant='subtitle1' fontWeight='medium'>
                {config.label}
              </Typography>
              <Chip label={items.length} color={config.color} size='small' />
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {items.length === 0 ? (
                <Typography variant='body2' color='text.secondary'>
                  -
                </Typography>
              ) : (
                items.map(item => (
                  <Box
                    key={item.id}
                    sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 2,
                      p: 1.5,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 0.5
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                      <Typography
                        variant='body2'
                        fontWeight='medium'
                        sx={{
                          maxWidth: '60%',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {item.nombre}
                      </Typography>
                      <Chip
                        label={`${item.porcentaje?.toFixed(0) ?? 0}%`}
                        size='small'
                        color={config.color}
                        sx={{ fontWeight: 700, fontSize: '0.7rem' }}
                      />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant='caption' color='text.secondary'>
                        {t('dashboard.projects.budget')}:
                      </Typography>
                      <Typography variant='caption' fontWeight='medium'>
                        {formatCurrency(item.presupuesto)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant='caption' color='text.secondary'>
                        {t('dashboard.projects.spent')}:
                      </Typography>
                      <Typography variant='caption' fontWeight='medium'>
                        {formatCurrency(item.gasto)}
                      </Typography>
                    </Box>
                  </Box>
                ))
              )}
            </Box>
          </Grid>
        )
      })}
    </Grid>
  )
}

export default FinancialStatus
