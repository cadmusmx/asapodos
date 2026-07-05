import { redirect } from 'next/navigation'

import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Divider from '@mui/material/Divider'
import Button from '@mui/material/Button'
import { requirePlatformRole } from '@gaso/shared'
import { getTenantStats, getRecentActivity } from '@/services/dashboard-service'
import { AUDIT_ACTION_LABELS, type AuditActionCode } from '@gaso/shared'

export const dynamic = 'force-dynamic'

const actionColors: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
  TEN_CR: 'success',
  TEN_UP: 'info',
  TEN_ACT: 'success',
  TEN_SUSP: 'warning',
  TEN_DEA: 'error'
}

function formatDate(date: Date | string | null | undefined) {
  if (!date) return '-'
  return new Date(date).toLocaleString('es-MX', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export default async function AdminDashboardPage() {
  const guard = await requirePlatformRole('super_admin')

  if (!guard.ok) {
    redirect('/admin/login')
  }

  const [stats, recentActivity] = await Promise.all([
    getTenantStats(),
    getRecentActivity(8)
  ])

  return (
    <Box>
      <Typography variant='h4' fontWeight='bold' gutterBottom>
        Dashboard
      </Typography>
      <Typography variant='body2' color='text.secondary' sx={{ mb: 4 }}>
        Resumen de la plataforma
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={6} sm={4} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <Typography variant='h3' fontWeight='bold' color='text.primary'>
                {stats.total}
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                Total Tenants
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <Typography variant='h3' fontWeight='bold' color='success.main'>
                {stats.active}
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                Activos
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <Typography variant='h3' fontWeight='bold' color='info.main'>
                {stats.trial}
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                Trial
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <Typography variant='h3' fontWeight='bold' color='warning.main'>
                {stats.suspended}
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                Suspendidos
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <Typography variant='h3' fontWeight='bold' color='error.main'>
                {stats.inactive}
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                Inactivos
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant='h6' fontWeight='bold'>
                  Actividad Reciente
                </Typography>
                <Button
                  variant='text'
                  size='small'
                  href='/admin/audit'
                  endIcon={<i className='ri-arrow-right-s-line' />}
                >
                  Ver todo
                </Button>
              </Box>
              <Divider sx={{ mb: 2 }} />

              {recentActivity.length === 0 ? (
                <Box sx={{ py: 4, textAlign: 'center' }}>
                  <Typography color='text.secondary'>No hay actividad reciente</Typography>
                </Box>
              ) : (
                <Stack spacing={1}>
                  {recentActivity.map((entry, i) => (
                    <Box
                      key={entry.auditId ? String(entry.auditId) : `entry-${i}`}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        py: 1,
                        borderBottom: i < recentActivity.length - 1 ? '1px solid' : 'none',
                        borderColor: 'divider'
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Chip
                          label={AUDIT_ACTION_LABELS[entry.action as AuditActionCode] || entry.action}
                          color={actionColors[entry.action] || 'default'}
                          size='small'
                          variant='outlined'
                        />
                        <Box>
                          <Typography variant='body2' fontWeight='medium'>
                            {entry.tenantName || 'Tenant desconocido'}
                          </Typography>
                          <Typography variant='caption' color='text.secondary'>
                            {entry.appUser || 'Sistema'}
                          </Typography>
                        </Box>
                      </Box>
                      <Typography variant='caption' color='text.secondary'>
                        {formatDate(entry.changedAt)}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant='h6' fontWeight='bold' gutterBottom>
                Acciones Rápidas
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Stack spacing={1.5}>
                <Button
                  variant='contained'
                  href='/admin/tenants'
                  startIcon={<i className='ri-add-line' />}
                  fullWidth
                >
                  Crear Nuevo Tenant
                </Button>
                <Button
                  variant='outlined'
                  href='/admin/tenants?status=ACTIVE'
                  startIcon={<i className='ri-play-circle-line' />}
                  fullWidth
                >
                  Ver Tenants Activos
                </Button>
                <Button
                  variant='outlined'
                  href='/admin/tenants?status=SUSPENDED'
                  startIcon={<i className='ri-pause-circle-line' />}
                  fullWidth
                >
                  Ver Suspendidos
                </Button>
                <Button
                  variant='outlined'
                  href='/admin/audit'
                  startIcon={<i className='ri-file-list-line' />}
                  fullWidth
                >
                  Ver Log de Auditoría
                </Button>
              </Stack>

              <Box sx={{ mt: 4 }}>
                <Typography variant='h6' fontWeight='bold' gutterBottom>
                  Distribución por Estado
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Stack spacing={1}>
                  {[
                    { label: 'Activos', color: 'success.main', value: stats.active },
                    { label: 'Trial', color: 'info.main', value: stats.trial },
                    { label: 'Suspendidos', color: 'warning.main', value: stats.suspended },
                    { label: 'Inactivos', color: 'error.main', value: stats.inactive }
                  ].map(item => (
                    <Box key={item.label} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: item.color }} />
                        <Typography variant='body2'>{item.label}</Typography>
                      </Box>
                      <Typography variant='body2' fontWeight='bold'>{item.value}</Typography>
                    </Box>
                  ))}
                </Stack>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}
