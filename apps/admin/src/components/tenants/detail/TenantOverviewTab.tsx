'use client'

import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import Chip from '@mui/material/Chip'
import type { TenantRow } from '@/services/tenant-service'
import type { TenantSubscription } from '@gaso/shared/types/plan'
import SubscriptionStatusBadge from '../SubscriptionStatusBadge'

interface TenantOverviewTabProps {
  tenant: TenantRow
  subscription: TenantSubscription | null
}

export default function TenantOverviewTab({ tenant, subscription }: TenantOverviewTabProps) {
  const formatDate = (date: Date | string | null) => {
    if (!date) return '-'
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant='h6' gutterBottom>Información del Tenant</Typography>
            <Divider sx={{ mb: 2 }} />

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant='body2' color='text.secondary'>Dominio</Typography>
                <Typography variant='body2' fontWeight='medium'>{tenant.Dominio ?? '-'}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant='body2' color='text.secondary'>Región</Typography>
                <Typography variant='body2' fontWeight='medium'>{tenant.Region ?? '-'}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant='body2' color='text.secondary'>Fecha de creación</Typography>
                <Typography variant='body2' fontWeight='medium'>
                  {formatDate(tenant.CreatedAt)}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant='body2' color='text.secondary'>Última actualización</Typography>
                <Typography variant='body2' fontWeight='medium'>
                  {formatDate(tenant.UpdatedAt)}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant='h6' gutterBottom>Suscripción</Typography>
            <Divider sx={{ mb: 2 }} />

            {subscription ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant='body2' color='text.secondary'>Plan</Typography>
                  <Typography variant='body2' fontWeight='bold'>{subscription.planDisplayName ?? subscription.planName ?? '-'}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant='body2' color='text.secondary'>Estado</Typography>
                  <SubscriptionStatusBadge status={subscription.status} />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant='body2' color='text.secondary'>Inicio</Typography>
                  <Typography variant='body2' fontWeight='medium'>{formatDate(subscription.startedAt)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant='body2' color='text.secondary'>Expiración</Typography>
                  <Typography variant='body2' fontWeight='medium'>{formatDate(subscription.expiresAt)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant='body2' color='text.secondary'>Auto-renovar</Typography>
                  <Chip
                    label={subscription.autoRenew ? 'Sí' : 'No'}
                    color={subscription.autoRenew ? 'success' : 'default'}
                    size='small'
                    variant='outlined'
                  />
                </Box>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant='body2' color='text.secondary'>Sin suscripción activa</Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>

      {tenant.SuspendedReason && (
        <Grid item xs={12}>
          <Card sx={{ border: '1px solid', borderColor: 'warning.main' }}>
            <CardContent>
              <Typography variant='h6' color='warning.main' gutterBottom>
                <i className='ri-alert-line' style={{ marginRight: 8 }} />
                Suspensión
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant='body2' color='text.secondary'>Fecha de suspensión</Typography>
                  <Typography variant='body2' fontWeight='medium'>{formatDate(tenant.SuspendedAt)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant='body2' color='text.secondary'>Razón</Typography>
                  <Typography variant='body2' fontWeight='medium'>{tenant.SuspendedReason}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      )}
    </Grid>
  )
}
