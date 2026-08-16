'use client'

import Grid from '@mui/material/Grid2'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'

const formatMXN = (value: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value)

type Props = {
  t: (key: string) => string
  counters: {
    gastoTotal: number
    solicitado: number
    unidades: number
    promedio: number
    solicitudes: number
    diferencia: number
  }
}

const FleetCounterCards = ({ t, counters }: Props) => {
  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, sm: 6, lg: 2 }}>
        <Card sx={{ borderRadius: '14px', border: '1px solid var(--mui-palette-divider)', height: '100%' }}>
          <CardContent sx={{ p: '1.25rem !important', '&:last-child': { pb: '1.25rem !important' } }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 48, height: 48, borderRadius: 10, background: 'var(--mui-palette-primary-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 20, flexShrink: 0 }}>
                <i className='ri-file-invoice-dollar-line' />
              </div>
              <div>
                <Typography variant='body2' sx={{ color: 'var(--mui-palette-text-secondary)', fontSize: '0.75rem', fontWeight: 500, lineHeight: 1.2 }}>
                  {t('dashboard.fleets.totalExpense')}
                </Typography>
                <Typography variant='h4' sx={{ fontWeight: 700, color: 'var(--mui-palette-text-primary)', lineHeight: 1.2, fontSize: '1.1rem' }}>
                  {formatMXN(counters.gastoTotal)}
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
              <div style={{ width: 48, height: 48, borderRadius: 10, background: 'var(--mui-palette-success-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 20, flexShrink: 0 }}>
                <i className='ri-money-check-alt-line' />
              </div>
              <div>
                <Typography variant='body2' sx={{ color: 'var(--mui-palette-text-secondary)', fontSize: '0.75rem', fontWeight: 500, lineHeight: 1.2 }}>
                  {t('dashboard.fleets.requested')}
                </Typography>
                <Typography variant='h4' sx={{ fontWeight: 700, color: 'var(--mui-palette-text-primary)', lineHeight: 1.2, fontSize: '1.1rem' }}>
                  {formatMXN(counters.solicitado)}
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
              <div style={{ width: 48, height: 48, borderRadius: 10, background: 'var(--mui-palette-info-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 20, flexShrink: 0 }}>
                <i className='ri-truck-line' />
              </div>
              <div>
                <Typography variant='body2' sx={{ color: 'var(--mui-palette-text-secondary)', fontSize: '0.75rem', fontWeight: 500, lineHeight: 1.2 }}>
                  {t('dashboard.fleets.units')}
                </Typography>
                <Typography variant='h4' sx={{ fontWeight: 700, color: 'var(--mui-palette-text-primary)', lineHeight: 1.2 }}>
                  {counters.unidades}
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
              <div style={{ width: 48, height: 48, borderRadius: 10, background: 'var(--mui-palette-warning-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 20, flexShrink: 0 }}>
                <i className='ri-calculator-line' />
              </div>
              <div>
                <Typography variant='body2' sx={{ color: 'var(--mui-palette-text-secondary)', fontSize: '0.75rem', fontWeight: 500, lineHeight: 1.2 }}>
                  {t('dashboard.fleets.avgPerUnit')}
                </Typography>
                <Typography variant='h4' sx={{ fontWeight: 700, color: 'var(--mui-palette-text-primary)', lineHeight: 1.2, fontSize: '1.1rem' }}>
                  {formatMXN(counters.promedio)}
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
              <div style={{ width: 48, height: 48, borderRadius: 10, background: 'var(--mui-palette-secondary-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 20, flexShrink: 0 }}>
                <i className='ri-file-list-3-line' />
              </div>
              <div>
                <Typography variant='body2' sx={{ color: 'var(--mui-palette-text-secondary)', fontSize: '0.75rem', fontWeight: 500, lineHeight: 1.2 }}>
                  {t('dashboard.fleets.requests')}
                </Typography>
                <Typography variant='h4' sx={{ fontWeight: 700, color: 'var(--mui-palette-text-primary)', lineHeight: 1.2 }}>
                  {counters.solicitudes}
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
              <div style={{ width: 48, height: 48, borderRadius: 10, background: 'var(--mui-palette-error-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 20, flexShrink: 0 }}>
                <i className='ri-alert-line' />
              </div>
              <div>
                <Typography variant='body2' sx={{ color: 'var(--mui-palette-text-secondary)', fontSize: '0.75rem', fontWeight: 500, lineHeight: 1.2 }}>
                  {t('dashboard.fleets.difference')}
                </Typography>
                <Typography variant='h4' sx={{ fontWeight: 700, color: 'var(--mui-palette-text-primary)', lineHeight: 1.2, fontSize: '1.1rem' }}>
                  {formatMXN(counters.diferencia)}
                </Typography>
              </div>
            </div>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

export default FleetCounterCards
