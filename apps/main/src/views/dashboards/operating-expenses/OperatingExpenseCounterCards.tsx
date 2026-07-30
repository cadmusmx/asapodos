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
            border: '1px solid #e5e7eb',
            boxShadow: '0 2px 8px rgba(15,23,42,.05)',
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
                  background: 'linear-gradient(135deg, #0d6efd, #0056b3)',
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
                  sx={{ color: '#6b7280', fontSize: '0.75rem', fontWeight: 500, lineHeight: 1.2 }}
                >
                  {t('dashboard.expenses.totalRequests')}
                </Typography>
                <Typography variant='h4' sx={{ fontWeight: 700, color: '#1f2937', lineHeight: 1.2 }}>
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
            border: '1px solid #e5e7eb',
            boxShadow: '0 2px 8px rgba(15,23,42,.05)',
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
                  background: 'linear-gradient(135deg, #198754, #14532d)',
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
                  sx={{ color: '#6b7280', fontSize: '0.75rem', fontWeight: 500, lineHeight: 1.2 }}
                >
                  {t('dashboard.expenses.accepted')}
                </Typography>
                <Typography variant='h4' sx={{ fontWeight: 700, color: '#1f2937', lineHeight: 1.2 }}>
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
            border: '1px solid #e5e7eb',
            boxShadow: '0 2px 8px rgba(15,23,42,.05)',
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
                  background: 'linear-gradient(135deg, #ffc107, #b45309)',
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
                  sx={{ color: '#6b7280', fontSize: '0.75rem', fontWeight: 500, lineHeight: 1.2 }}
                >
                  {t('dashboard.expenses.pending')}
                </Typography>
                <Typography variant='h4' sx={{ fontWeight: 700, color: '#1f2937', lineHeight: 1.2 }}>
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
            border: '1px solid #e5e7eb',
            boxShadow: '0 2px 8px rgba(15,23,42,.05)',
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
                  background: 'linear-gradient(135deg, #dc3545, #880e4f)',
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
                  sx={{ color: '#6b7280', fontSize: '0.75rem', fontWeight: 500, lineHeight: 1.2 }}
                >
                  {t('dashboard.expenses.rejected')}
                </Typography>
                <Typography variant='h4' sx={{ fontWeight: 700, color: '#1f2937', lineHeight: 1.2 }}>
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
            border: '1px solid #e5e7eb',
            boxShadow: '0 2px 8px rgba(15,23,42,.05)',
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
                  background: 'linear-gradient(135deg, #20c997, #0f766e)',
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
                  sx={{ color: '#6b7280', fontSize: '0.75rem', fontWeight: 500, lineHeight: 1.2 }}
                >
                  {t('dashboard.expenses.paid')}
                </Typography>
                <Typography variant='h4' sx={{ fontWeight: 700, color: '#1f2937', lineHeight: 1.2 }}>
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
            border: '1px solid #e5e7eb',
            boxShadow: '0 2px 8px rgba(15,23,42,.05)',
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
                  background: 'linear-gradient(135deg, #6f42c1, #4c1d95)',
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
                  sx={{ color: '#6b7280', fontSize: '0.75rem', fontWeight: 500, lineHeight: 1.2 }}
                >
                  {t('dashboard.expenses.paidAmount')}
                </Typography>
                <Typography variant='h4' sx={{ fontWeight: 700, color: '#1f2937', lineHeight: 1.2 }}>
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
