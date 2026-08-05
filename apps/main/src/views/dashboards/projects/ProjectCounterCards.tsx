'use client'

import Grid from '@mui/material/Grid2'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'

type Props = {
  t: (key: string) => string
  counters: {
    total: number
    activos: number
    inactivos: number
  }
}

const ProjectCounterCards = ({ t, counters }: Props) => {
  const items = [
    { label: t('dashboard.projects.totalProjects'), value: counters.total, color: 'var(--mui-palette-primary-main)', icon: 'ri-briefcase-line' },
    { label: t('dashboard.projects.active'), value: counters.activos, color: 'var(--mui-palette-success-main)', icon: 'ri-checkbox-circle-line' },
    { label: t('dashboard.projects.pending'), value: counters.inactivos, color: 'var(--mui-palette-warning-main)', icon: 'ri-time-line' }
  ]

  return (
    <Grid container spacing={3}>
      {items.map((item, index) => (
        <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={index}>
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
                    background: item.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: 20,
                    flexShrink: 0
                  }}
                >
                  <i className={item.icon} />
                </div>
                <div>
                  <Typography
                    variant='body2'
                    sx={{ color: 'var(--mui-palette-text-secondary)', fontSize: '0.75rem', fontWeight: 500, lineHeight: 1.2 }}
                  >
                    {item.label}
                  </Typography>
                  <Typography variant='h4' sx={{ fontWeight: 700, color: 'var(--mui-palette-text-primary)', lineHeight: 1.2 }}>
                    {item.value.toLocaleString()}
                  </Typography>
                </div>
              </div>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  )
}

export default ProjectCounterCards
