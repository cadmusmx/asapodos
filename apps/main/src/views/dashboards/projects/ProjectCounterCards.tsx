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
    { label: t('dashboard.projects.totalProjects'), value: counters.total, gradient: 'linear-gradient(135deg, #0d6efd, #0056b3)', icon: 'ri-briefcase-line' },
    { label: t('dashboard.projects.active'), value: counters.activos, gradient: 'linear-gradient(135deg, #198754, #14532d)', icon: 'ri-checkbox-circle-line' },
    { label: t('dashboard.projects.pending'), value: counters.inactivos, gradient: 'linear-gradient(135deg, #ffc107, #b45309)', icon: 'ri-time-line' }
  ]

  return (
    <Grid container spacing={3}>
      {items.map((item, index) => (
        <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={index}>
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
                    background: item.gradient,
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
                    sx={{ color: '#6b7280', fontSize: '0.75rem', fontWeight: 500, lineHeight: 1.2 }}
                  >
                    {item.label}
                  </Typography>
                  <Typography variant='h4' sx={{ fontWeight: 700, color: '#1f2937', lineHeight: 1.2 }}>
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
