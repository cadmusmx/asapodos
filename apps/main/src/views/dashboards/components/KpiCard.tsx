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

const KpiCard = ({
  title,
  subtitle,
  borderColor,
  iconBackground,
  iconColor,
  iconClass,
  children,
  action,
  loading = false
}: Props) => {
  return (
    <Card
      sx={{
        borderRadius: '16px',
        border: '1px solid var(--mui-palette-divider)',
        borderTop: `3px solid ${borderColor || 'var(--mui-palette-primary-main)'}`,
        transition: 'transform .2s',
        height: '100%',
        '&:hover': {
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
                background: iconBackground || 'rgba(var(--mui-palette-primary-mainChannel) / 0.12)',
                color: iconColor || 'var(--mui-palette-primary-main)'
              }}
            >
              {iconClass && (
                <FontAwesomeIconComponent icon={iconClass} className={iconClass} style={{ width: 24, height: 24 }} />
              )}
            </div>
          </Grid>
          <Grid size='grow' sx={{ ml: 2 }}>
            <Typography
              variant='h6'
              sx={{
                fontSize: '1rem',
                fontWeight: 700,
                color: 'var(--mui-palette-text-primary)',
                lineHeight: 1.3
              }}
            >
              {title}
            </Typography>
            {subtitle && (
              <Typography
                variant='body2'
                sx={{ color: 'var(--mui-palette-text-secondary)', fontSize: '0.75rem', mt: 0.5 }}
              >
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
