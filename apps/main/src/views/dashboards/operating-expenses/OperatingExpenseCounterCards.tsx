'use client'

import Grid from '@mui/material/Grid2'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'

type Props = {
  t: (key: string) => string
  counters: {
    total: number
    aceptadas: number
    pendientes: number
    rechazadas: number
    pagadas: number
    montoPagadas: number
  }
}

const OperatingExpenseCounterCards = ({ t, counters }: Props) => {
  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, sm: 6, lg: 2 }}>
        <Card
          sx={{
            borderRadius: '14px',
            border: '1px solid var(--mui-palette-divider)',
            height: '100%'
          }}
        >
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
                  sx={{ color: 'var(--mui-palette-text-secondary)', fontSize: '0.75rem', fontWeight: 500, lineHeight: 1.2 }}
                >
                  {t('dashboard.expenses.totalRequests')}
                </Typography>
                <Typography variant='h4' sx={{ fontWeight: 700, color: 'var(--mui-palette-text-primary)', lineHeight: 1.2 }}>
                  {counters.total}
                </Typography>
              </div>
            </div>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, sm: 6, lg: 2 }}>
        <Card
          sx={{
            borderRadius: '14px',
            border: '1px solid var(--mui-palette-divider)',
            height: '100%'
          }}
        >
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
                <i className='ri-checkbox-circle-line' />
              </div>
              <div>
                <Typography
                  variant='body2'
                  sx={{ color: 'var(--mui-palette-text-secondary)', fontSize: '0.75rem', fontWeight: 500, lineHeight: 1.2 }}
                >
                  {t('dashboard.expenses.accepted')}
                </Typography>
                <Typography variant='h4' sx={{ fontWeight: 700, color: 'var(--mui-palette-text-primary)', lineHeight: 1.2 }}>
                  {counters.aceptadas}
                </Typography>
              </div>
            </div>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, sm: 6, lg: 2 }}>
        <Card
          sx={{
            borderRadius: '14px',
            border: '1px solid var(--mui-palette-divider)',
            height: '100%'
          }}
        >
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
                  sx={{ color: 'var(--mui-palette-text-secondary)', fontSize: '0.75rem', fontWeight: 500, lineHeight: 1.2 }}
                >
                  {t('dashboard.expenses.pending')}
                </Typography>
                <Typography variant='h4' sx={{ fontWeight: 700, color: 'var(--mui-palette-text-primary)', lineHeight: 1.2 }}>
                  {counters.pendientes}
                </Typography>
              </div>
            </div>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, sm: 6, lg: 2 }}>
        <Card
          sx={{
            borderRadius: '14px',
            border: '1px solid var(--mui-palette-divider)',
            height: '100%'
          }}
        >
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
                  sx={{ color: 'var(--mui-palette-text-secondary)', fontSize: '0.75rem', fontWeight: 500, lineHeight: 1.2 }}
                >
                  {t('dashboard.expenses.rejected')}
                </Typography>
                <Typography variant='h4' sx={{ fontWeight: 700, color: 'var(--mui-palette-text-primary)', lineHeight: 1.2 }}>
                  {counters.rechazadas}
                </Typography>
              </div>
            </div>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, sm: 6, lg: 2 }}>
        <Card
          sx={{
            borderRadius: '14px',
            border: '1px solid var(--mui-palette-divider)',
            height: '100%'
          }}
        >
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
                <i className='ri-wallet-line' />
              </div>
              <div>
                <Typography
                  variant='body2'
                  sx={{ color: 'var(--mui-palette-text-secondary)', fontSize: '0.75rem', fontWeight: 500, lineHeight: 1.2 }}
                >
                  {t('dashboard.expenses.paid')}
                </Typography>
                <Typography variant='h4' sx={{ fontWeight: 700, color: 'var(--mui-palette-text-primary)', lineHeight: 1.2 }}>
                  {counters.pagadas}
                </Typography>
              </div>
            </div>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, sm: 6, lg: 2 }}>
        <Card
          sx={{
            borderRadius: '14px',
            border: '1px solid var(--mui-palette-divider)',
            height: '100%'
          }}
        >
          <CardContent sx={{ p: '1.25rem !important', '&:last-child': { pb: '1.25rem !important' } }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 10,
                  background: 'var(--mui-palette-secondary-main)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: 20,
                  flexShrink: 0
                }}
              >
                <i className='ri-money-dollar-circle-line' />
              </div>
              <div>
                <Typography
                  variant='body2'
                  sx={{ color: 'var(--mui-palette-text-secondary)', fontSize: '0.75rem', fontWeight: 500, lineHeight: 1.2 }}
                >
                  {t('dashboard.expenses.paidAmount')}
                </Typography>
                <Typography variant='h4' sx={{ fontWeight: 700, color: 'var(--mui-palette-text-primary)', lineHeight: 1.2 }}>
                  ${counters.montoPagadas.toLocaleString()}
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
