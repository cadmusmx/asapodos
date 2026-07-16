'use client'

import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import LinearProgress from '@mui/material/LinearProgress'
import type { TenantUsage } from '@gaso/shared/types/plan'

interface UsageWithLimit extends TenantUsage {
  limit: number | null
}

interface TenantUsageTabProps {
  usage: UsageWithLimit[]
}

const METRIC_LABELS: Record<string, { label: string; unit: string }> = {
  users: { label: 'Usuarios', unit: '' },
  branches: { label: 'Sucursales', unit: '' },
  storage_mb: { label: 'Almacenamiento', unit: 'MB' }
}

function getProgressColor(current: number, limit: number | null): 'error' | 'warning' | 'success' {
  if (limit === null) return 'success'
  const pct = (current / limit) * 100
  if (pct >= 100) return 'error'
  if (pct >= 80) return 'warning'
  return 'success'
}

function formatValue(current: number, unit: string): string {
  if (unit === 'MB' && current >= 1024) {
    return `${(current / 1024).toFixed(2)} GB`
  }
  return `${current} ${unit}`
}

export default function TenantUsageTab({ usage }: TenantUsageTabProps) {
  const usageMap = new Map(usage.map(u => [u.metricKey, u]))

  const metrics = ['users', 'branches', 'storage_mb'] as const

  return (
    <Grid container spacing={3}>
      {metrics.map(key => {
        const item = usageMap.get(key)
        const meta = METRIC_LABELS[key]
        const current = item?.currentValue ?? 0
        const limit = item?.limit ?? null
        const color = getProgressColor(current, limit)
        const pct = limit !== null && limit > 0 ? Math.min((current / limit) * 100, 100) : 0

        return (
          <Grid item xs={12} md={6} lg={4} key={key}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant='h6'>{meta.label}</Typography>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant='h5' fontWeight='bold'>
                      {formatValue(current, meta.unit)}
                    </Typography>
                    {limit !== null ? (
                      <Typography variant='body2' color='text.secondary'>
                        / {formatValue(limit, meta.unit)}
                      </Typography>
                    ) : (
                      <Typography variant='body2' color='success.main'>Ilimitado</Typography>
                    )}
                  </Box>
                </Box>

                {limit !== null ? (
                  <>
                    <LinearProgress
                      variant='determinate'
                      value={pct}
                      color={color}
                      sx={{ height: 8, borderRadius: 4, mb: 1 }}
                    />
                    <Typography variant='body2' color={`${color}.main`} fontWeight='medium'>
                      {pct.toFixed(0)}% utilizado
                    </Typography>
                    {item?.isExceeded && (
                      <Typography variant='body2' color='error.main' sx={{ mt: 0.5 }}>
                        Límite excedido
                      </Typography>
                    )}
                  </>
                ) : (
                  <LinearProgress
                    variant='determinate'
                    value={0}
                    color='success'
                    sx={{ height: 8, borderRadius: 4, mb: 1, backgroundColor: 'success.light' }}
                  />
                )}
              </CardContent>
            </Card>
          </Grid>
        )
      })}

      {usage.length === 0 && (
        <Grid item xs={12}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 4 }}>
              <Typography color='text.secondary'>
                No hay datos de uso registrados para este tenant.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      )}
    </Grid>
  )
}
