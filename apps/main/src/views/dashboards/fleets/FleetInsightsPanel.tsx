'use client'

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Grid from '@mui/material/Grid2'
import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'

type FleetInsights = {
  topUnit: { label: string; value: number } | null
  topType: { label: string; value: number } | null
  topResponsible: { label: string; value: number } | null
  pending: number
}

type Props = {
  t: (key: string) => string
  insights: FleetInsights
}

const formatMXN = (value: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value)

const FleetInsightsPanel = ({ t, insights }: Props) => {
  const { topUnit, topType, topResponsible, pending } = insights

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, p: 1 }}>
      {pending > 0 && (
        <Alert severity='warning' sx={{ borderRadius: 2 }}>
          <AlertTitle sx={{ fontWeight: 700, fontSize: '0.85rem' }}>{t('dashboard.fleets.pendingRequests')}</AlertTitle>
          <Typography variant='body2'>{pending} {t('dashboard.fleets.pendingDescription')}</Typography>
        </Alert>
      )}

      <Grid container spacing={2}>
        {topUnit && (
          <Grid size={{ xs: 12, sm: 4 }}>
            <Box sx={{ p: 1.5, borderRadius: 2, border: '1px solid var(--mui-palette-divider)', background: 'var(--mui-palette-background-default)' }}>
              <Typography variant='caption' sx={{ color: 'var(--mui-palette-text-disabled)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 0.5 }}>
                {t('dashboard.fleets.topUnit')}
              </Typography>
              <Typography variant='body2' sx={{ fontWeight: 700, color: 'var(--mui-palette-text-primary)', mb: 0.25 }}>
                #{topUnit.label}
              </Typography>
              <Typography variant='body2' sx={{ color: 'var(--mui-palette-primary-main)', fontWeight: 600 }}>
                {formatMXN(topUnit.value)}
              </Typography>
            </Box>
          </Grid>
        )}

        {topType && (
          <Grid size={{ xs: 12, sm: 4 }}>
            <Box sx={{ p: 1.5, borderRadius: 2, border: '1px solid var(--mui-palette-divider)', background: 'var(--mui-palette-background-default)' }}>
              <Typography variant='caption' sx={{ color: 'var(--mui-palette-text-disabled)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 0.5 }}>
                {t('dashboard.fleets.topType')}
              </Typography>
              <Typography variant='body2' sx={{ fontWeight: 700, color: 'var(--mui-palette-text-primary)', mb: 0.25 }}>
                {topType.label}
              </Typography>
              <Typography variant='body2' sx={{ color: 'var(--mui-palette-success-main)', fontWeight: 600 }}>
                {formatMXN(topType.value)}
              </Typography>
            </Box>
          </Grid>
        )}

        {topResponsible && (
          <Grid size={{ xs: 12, sm: 4 }}>
            <Box sx={{ p: 1.5, borderRadius: 2, border: '1px solid var(--mui-palette-divider)', background: 'var(--mui-palette-background-default)' }}>
              <Typography variant='caption' sx={{ color: 'var(--mui-palette-text-disabled)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 0.5 }}>
                {t('dashboard.fleets.topResponsible')}
              </Typography>
              <Typography variant='body2' sx={{ fontWeight: 700, color: 'var(--mui-palette-text-primary)', mb: 0.25 }}>
                {topResponsible.label}
              </Typography>
              <Typography variant='body2' sx={{ color: 'var(--mui-palette-warning-main)', fontWeight: 600 }}>
                {formatMXN(topResponsible.value)}
              </Typography>
            </Box>
          </Grid>
        )}
      </Grid>
    </Box>
  )
}

export default FleetInsightsPanel
