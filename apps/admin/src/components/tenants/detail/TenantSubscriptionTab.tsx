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

interface TenantSubscriptionTabProps {
  tenant: TenantRow
  subscription: TenantSubscription | null
}

export default function TenantSubscriptionTab({ subscription }: TenantSubscriptionTabProps) {
  const formatDate = (date: Date | string | null) => {
    if (!date) return '-'
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={8}>
        <Card>
          <CardContent>
            <Typography variant='h6' sx={{ mb: 2 }}>Suscripción Actual</Typography>
            <Divider sx={{ mb: 2 }} />

            {subscription ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography variant='h4' fontWeight='bold'>
                    {subscription.planDisplayName ?? subscription.planName ?? '-'}
                  </Typography>
                  <SubscriptionStatusBadge status={subscription.status} />
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={6} sm={3}>
                    <Typography variant='body2' color='text.secondary'>Inicio</Typography>
                    <Typography variant='body2' fontWeight='medium'>{formatDate(subscription.startedAt)}</Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant='body2' color='text.secondary'>Expiración</Typography>
                    <Typography variant='body2' fontWeight='medium'>{formatDate(subscription.expiresAt)}</Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant='body2' color='text.secondary'>Auto-renovar</Typography>
                    <Chip
                      label={subscription.autoRenew ? 'Sí' : 'No'}
                      color={subscription.autoRenew ? 'success' : 'default'}
                      size='small'
                      variant='outlined'
                    />
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant='body2' color='text.secondary'>ID Suscripción</Typography>
                    <Typography variant='body2' fontWeight='medium' sx={{ fontSize: '0.75rem' }}>
                      {subscription.subscriptionId.slice(0, 8)}...
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            ) : (
              <Box sx={{ py: 4, textAlign: 'center' }}>
                <Typography color='text.secondary'>
                  Este tenant no tiene una suscripción activa.
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}
