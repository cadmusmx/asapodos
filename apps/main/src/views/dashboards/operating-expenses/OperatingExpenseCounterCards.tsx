'use client'

import Grid from '@mui/material/Grid2'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'

const formatMXN = (value: number) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)

type Props = {
  t: (key: string) => string
  counters: {
    total: number
    facturada: number
    pagada: number
    pendiente: number
    aceptada: number
    rechazada: number
  }
}

const OperatingExpenseCounterCards = ({ t, counters }: Props) => {
  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, sm: 6, lg: 2 }}>
        <Card sx={{ borderRadius: '14px', border: '1px solid var(--mui-palette-divider)', height: '100%' }}>
          <CardContent sx={{ p: '1.25rem !important', '&:last-child': { pb: '1.25rem !important' } }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 10,
                  background: 'var(--mui-palette-primary-main)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: 20,
                  flexShrink: 0
                }}
              >
                <i className='ri-file-list-3-line' />
              </div>
              <div>
                <Typography
                  variant='body2'
                  sx={{
                    color: 'var(--mui-palette-text-secondary)',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    lineHeight: 1.2
                  }}
                >
                  {t('dashboard.expenses.totalRequests')}
                </Typography>
                <Typography
                  variant='h4'
                  sx={{ fontWeight: 700, color: 'var(--mui-palette-text-primary)', lineHeight: 1.2 }}
                >
                  {counters.total}
                </Typography>
              </div>
            </div>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, sm: 6, lg: 2 }}>
        <Card sx={{ borderRadius: '14px', border: '1px solid var(--mui-palette-divider)', height: '100%' }}>
          <CardContent sx={{ p: '1.25rem !important', '&:last-child': { pb: '1.25rem !important' } }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 10,
                  background: 'var(--mui-palette-success-main)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: 20,
                  flexShrink: 0
                }}
              >
                <i className='ri-receipt-line' />
              </div>
              <div>
                <Typography
                  variant='body2'
                  sx={{
                    color: 'var(--mui-palette-text-secondary)',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    lineHeight: 1.2
                  }}
                >
                  {t('dashboard.expenses.invoiced')}
                </Typography>
                <Typography
                  variant='h4'
                  sx={{
                    fontWeight: 700,
                    color: 'var(--mui-palette-text-primary)',
                    lineHeight: 1.2,
                    fontSize: '1.1rem'
                  }}
                >
                  {formatMXN(counters.facturada)}
                </Typography>
              </div>
            </div>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, sm: 6, lg: 2 }}>
        <Card sx={{ borderRadius: '14px', border: '1px solid var(--mui-palette-divider)', height: '100%' }}>
          <CardContent sx={{ p: '1.25rem !important', '&:last-child': { pb: '1.25rem !important' } }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 10,
                  background: 'var(--mui-palette-info-main)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: 20,
                  flexShrink: 0
                }}
              >
                <i className='ri-money-check-alt-line' />
              </div>
              <div>
                <Typography
                  variant='body2'
                  sx={{
                    color: 'var(--mui-palette-text-secondary)',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    lineHeight: 1.2
                  }}
                >
                  {t('dashboard.expenses.paid')}
                </Typography>
                <Typography
                  variant='h4'
                  sx={{
                    fontWeight: 700,
                    color: 'var(--mui-palette-text-primary)',
                    lineHeight: 1.2,
                    fontSize: '1.1rem'
                  }}
                >
                  {formatMXN(counters.pagada)}
                </Typography>
              </div>
            </div>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, sm: 6, lg: 2 }}>
        <Card sx={{ borderRadius: '14px', border: '1px solid var(--mui-palette-divider)', height: '100%' }}>
          <CardContent sx={{ p: '1.25rem !important', '&:last-child': { pb: '1.25rem !important' } }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 10,
                  background: 'var(--mui-palette-warning-main)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: 20,
                  flexShrink: 0
                }}
              >
                <i className='ri-time-line' />
              </div>
              <div>
                <Typography
                  variant='body2'
                  sx={{
                    color: 'var(--mui-palette-text-secondary)',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    lineHeight: 1.2
                  }}
                >
                  {t('dashboard.expenses.pending')}
                </Typography>
                <Typography
                  variant='h4'
                  sx={{
                    fontWeight: 700,
                    color: 'var(--mui-palette-text-primary)',
                    lineHeight: 1.2,
                    fontSize: '1.1rem'
                  }}
                >
                  {formatMXN(counters.pendiente)}
                </Typography>
              </div>
            </div>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, sm: 6, lg: 2 }}>
        <Card sx={{ borderRadius: '14px', border: '1px solid var(--mui-palette-divider)', height: '100%' }}>
          <CardContent sx={{ p: '1.25rem !important', '&:last-child': { pb: '1.25rem !important' } }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 10,
                  background: 'var(--mui-palette-success-light)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--mui-palette-success-main)',
                  fontSize: 20,
                  flexShrink: 0
                }}
              >
                <i className='ri-checkbox-circle-line' />
              </div>
              <div>
                <Typography
                  variant='body2'
                  sx={{
                    color: 'var(--mui-palette-text-secondary)',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    lineHeight: 1.2
                  }}
                >
                  {t('dashboard.expenses.accepted')}
                </Typography>
                <Typography
                  variant='h4'
                  sx={{
                    fontWeight: 700,
                    color: 'var(--mui-palette-text-primary)',
                    lineHeight: 1.2,
                    fontSize: '1.1rem'
                  }}
                >
                  {formatMXN(counters.aceptada)}
                </Typography>
              </div>
            </div>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, sm: 6, lg: 2 }}>
        <Card sx={{ borderRadius: '14px', border: '1px solid var(--mui-palette-divider)', height: '100%' }}>
          <CardContent sx={{ p: '1.25rem !important', '&:last-child': { pb: '1.25rem !important' } }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 10,
                  background: 'var(--mui-palette-error-main)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: 20,
                  flexShrink: 0
                }}
              >
                <i className='ri-close-circle-line' />
              </div>
              <div>
                <Typography
                  variant='body2'
                  sx={{
                    color: 'var(--mui-palette-text-secondary)',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    lineHeight: 1.2
                  }}
                >
                  {t('dashboard.expenses.rejected')}
                </Typography>
                <Typography
                  variant='h4'
                  sx={{
                    fontWeight: 700,
                    color: 'var(--mui-palette-text-primary)',
                    lineHeight: 1.2,
                    fontSize: '1.1rem'
                  }}
                >
                  {formatMXN(counters.rechazada)}
                </Typography>
              </div>
            </div>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

export default OperatingExpenseCounterCards
