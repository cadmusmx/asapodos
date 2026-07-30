'use client'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Grid from '@mui/material/Grid2'
import Box from '@mui/material/Box'
import Skeleton from '@mui/material/Skeleton'
import FontAwesomeIconComponent from './FontAwesomeIcon'

type Props = {
  title: string
  subtitle?: string
  borderColor?: string
  iconBackground?: string
  iconColor?: string
  iconClass?: string
  children: React.ReactNode
  action?: React.ReactNode
  loading?: boolean
}

const KpiCard = ({ title, subtitle, borderColor = '#0d6efd', iconBackground, iconColor, iconClass, children, action, loading = false }: Props) => {
  return (
    <Card
      sx={{
        borderRadius: '16px',
        border: '1px solid rgba(0,0,0,.06)',
        boxShadow: '0 2px 12px rgba(15,23,42,.07)',
        borderTop: `3px solid ${borderColor}`,
        transition: 'box-shadow .2s, transform .2s',
        height: '100%',
        '&:hover': {
          boxShadow: '0 8px 28px rgba(13,110,253,.14)',
          transform: 'translateY(-3px)'
        }
      }}
    >
      <CardContent>
        <Grid container spacing={0} alignItems='center' sx={{ mb: 2 }}>
          <Grid size='auto'>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                background: iconBackground || 'rgba(13,110,253,.12)',
                color: iconColor || '#0d6efd'
              }}
            >
              {iconClass && <FontAwesomeIconComponent icon={iconClass} className={iconClass} style={{ width: 24, height: 24 }} />}
            </div>
          </Grid>
          <Grid size='grow' sx={{ ml: 2 }}>
            <Typography
              variant='h6'
              sx={{
                fontSize: '1rem',
                fontWeight: 700,
                color: '#1f2937',
                lineHeight: 1.3
              }}
            >
              {title}
            </Typography>
            {subtitle && (
              <Typography variant='body2' sx={{ color: '#6b7280', fontSize: '0.75rem', mt: 0.5 }}>
                {subtitle}
              </Typography>
            )}
          </Grid>
          {action && <Grid size='auto'>{action}</Grid>}
        </Grid>
        <Box sx={{ position: 'relative', width: '100%', minHeight: 220 }}>
          {loading ? (
            <Box sx={{ p: 1 }}>
              <Skeleton variant='rectangular' width='100%' height={180} sx={{ borderRadius: 2 }} />
            </Box>
          ) : (
            children
          )}
        </Box>
      </CardContent>
    </Card>
  )
}

export default KpiCard
