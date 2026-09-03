'use client'

import Grid from '@mui/material/Grid2'
import Typography from '@mui/material/Typography'

type Props = {
  t: (key: string) => string
  data: {
    humanCapital: { activos: number; inactivos: number }
    inventario: { total: number; palets: number; arribos: number; salidas: number }
    gastos: { total: number; aceptadas: number; pendientes: number; rechazadas: number }
    cotizaciones: { total: number; aceptadas: number; pendientes: number; rechazadas: number }
    proyectos: { total: number; activos: number; inactivos: number }
    almacenes: { total: number }
  }
}

const colorMap: Record<string, string> = {
  primary: 'rgba(var(--mui-palette-primary-mainChannel) / 0.12)',
  success: 'rgba(var(--mui-palette-success-mainChannel) / 0.12)',
  error: 'rgba(var(--mui-palette-error-mainChannel) / 0.12)',
  warning: 'rgba(var(--mui-palette-warning-mainChannel) / 0.15)'
}

const iconColorMap: Record<string, string> = {
  primary: 'var(--mui-palette-primary-main)',
  success: 'var(--mui-palette-success-main)',
  error: 'var(--mui-palette-error-main)',
  warning: 'var(--mui-palette-warning-main)'
}

const GeneralCounterCards = ({ t, data }: Props) => {
  const cards = [
    {
      label: t('dashboard.general.humanCapital'),
      items: [
        {
          label: t('dashboard.general.active'),
          value: data.humanCapital.activos,
          color: 'primary',
          icon: 'ri-user-follow-line'
        },
        {
          label: t('dashboard.general.inactive'),
          value: data.humanCapital.inactivos,
          color: 'error',
          icon: 'ri-user-forbidden-line'
        }
      ]
    },
    {
      label: t('dashboard.general.inventory'),
      items: [
        {
          label: t('dashboard.general.totalSites'),
          value: data.inventario.total,
          color: 'primary',
          icon: 'ri-server-line'
        },
        {
          label: t('dashboard.general.totalPallets'),
          value: data.inventario.palets,
          color: 'warning',
          icon: 'ri-file-list-3-line'
        }
      ]
    },
    {
      label: t('dashboard.general.operatingExpenses'),
      items: [
        {
          label: t('dashboard.general.total'),
          value: data.gastos.total,
          color: 'primary',
          icon: 'ri-file-list-2-line'
        },
        { label: t('dashboard.general.pending'), value: data.gastos.pendientes, color: 'warning', icon: 'ri-time-line' }
      ]
    },
    {
      label: t('dashboard.general.fleets'),
      items: [
        { label: t('dashboard.general.total'), value: data.gastos.total, color: 'primary', icon: 'ri-truck-line' },
        { label: t('dashboard.general.pending'), value: data.gastos.pendientes, color: 'warning', icon: 'ri-time-line' }
      ]
    },
    {
      label: t('dashboard.general.quotes'),
      items: [
        {
          label: t('dashboard.general.total'),
          value: data.cotizaciones.total,
          color: 'primary',
          icon: 'ri-file-text-line'
        },
        {
          label: t('dashboard.general.approved'),
          value: data.cotizaciones.aceptadas,
          color: 'success',
          icon: 'ri-checkbox-circle-line'
        }
      ]
    },
    {
      label: t('dashboard.general.projects'),
      items: [
        {
          label: t('dashboard.general.active'),
          value: data.proyectos.activos,
          color: 'success',
          icon: 'ri-briefcase-line'
        },
        {
          label: t('dashboard.general.inactive'),
          value: data.proyectos.inactivos,
          color: 'error',
          icon: 'ri-time-line'
        }
      ]
    }
  ]

  return (
    <Grid container spacing={3} sx={{ mb: 4 }}>
      {cards.map((card, index) => (
        <Grid size={{ xs: 12, sm: 6, md: 4 }} key={index}>
          <div
            style={{
              borderRadius: 16,
              border: '1px solid var(--mui-palette-divider)',
              background: 'var(--mui-palette-background-paper)',
              padding: '1.25rem',
              height: '100%'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.3rem',
                  background: colorMap[card.items[0].color],
                  color: iconColorMap[card.items[0].color]
                }}
              >
                <i className={card.items[0].icon} />
              </div>
              <Typography
                sx={{
                  fontSize: '1rem',
                  fontWeight: 700,
                  color: 'var(--mui-palette-text-primary)',
                  fontFamily: '"Carter One", system-ui'
                }}
              >
                {card.label}
              </Typography>
            </div>
            <Grid container spacing={2}>
              {card.items.map((item, idx) => (
                <Grid size={6} key={idx}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 12px',
                      borderRadius: 10,
                      background: 'var(--mui-palette-background-paper)',
                      border: '2px solid var(--mui-palette-divider)'
                    }}
                  >
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.9rem',
                        background: colorMap[item.color],
                        color: iconColorMap[item.color]
                      }}
                    >
                      <i className={item.icon} />
                    </div>
                    <div>
                      <Typography
                        sx={{
                          fontSize: '1.6rem',
                          fontWeight: 800,
                          color: 'var(--mui-palette-text-primary)',
                          lineHeight: 1
                        }}
                      >
                        {item.value.toLocaleString()}
                      </Typography>
                      <Typography sx={{ fontSize: '0.75rem', color: 'var(--mui-palette-text-secondary)' }}>
                        {item.label}
                      </Typography>
                    </div>
                  </div>
                </Grid>
              ))}
            </Grid>
          </div>
        </Grid>
      ))}
    </Grid>
  )
}

export default GeneralCounterCards
