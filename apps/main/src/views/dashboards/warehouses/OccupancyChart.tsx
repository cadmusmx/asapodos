'use client'

import dynamic from 'next/dynamic'

import { useTheme } from '@mui/material/styles'
import type { ApexOptions } from 'apexcharts'

const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'))

type Props = {
  t: (key: string) => string
  counters: {
    capacidadTotal: number
    espacioOcupado: number
    espacioDisponible: number
    totalAlmacenes: number
  }
  occupancyPercentage: number
}

const OccupancyChart = ({ t, counters, occupancyPercentage }: Props) => {
  const theme = useTheme()

  const options: ApexOptions = {
    chart: {
      sparkline: { enabled: true }
    },
    colors: ['var(--mui-palette-warning-main)', 'var(--mui-palette-success-main)'],
    stroke: { width: 0 },
    legend: { show: true, position: 'bottom' },
    tooltip: {
      custom: ({ series, seriesIndex, w }) => {
        const label = w.globals.labels[seriesIndex] as string
        const value = series[seriesIndex] as number
        const total = (series as number[]).reduce((a, b) => a + b, 0)
        const pct = ((value / total) * 100).toFixed(1)

        return `<div style="padding:8px 12px;background:var(--mui-palette-background-paper);color:var(--mui-palette-text-primary);border-radius:8px;font-size:13px;border:1px solid var(--mui-palette-divider);">
          <strong>${label}</strong><br/>
          ${value.toLocaleString()} (${pct}%)
        </div>`
      }
    },
    dataLabels: { enabled: false },
    labels: [t('dashboard.warehouses.occupiedSpace'), t('dashboard.warehouses.availableSpace')],
    states: {
      hover: { filter: { type: 'none' } },
      active: { filter: { type: 'none' } }
    },
    plotOptions: {
      pie: {
        customScale: 0.9,
        donut: {
          size: '70%',
          labels: {
            show: true,
            name: {
              offsetY: 25,
              fontSize: '0.875rem',
              color: 'var(--mui-palette-text-secondary)'
            },
            value: {
              offsetY: -15,
              fontWeight: 500,
              fontSize: '24px',
              formatter: value => `${value}%`,
              color: 'var(--mui-palette-text-primary)'
            },
            total: {
              show: true,
              fontSize: '0.875rem',
              label: t('dashboard.warehouses.occupancyRate'),
              color: 'var(--mui-palette-text-secondary)',
              formatter: () => `${occupancyPercentage}%`
            }
          }
        }
      }
    },
    responsive: [
      {
        breakpoint: 1300,
        options: { chart: { height: 220 } }
      },
      {
        breakpoint: theme.breakpoints.values.lg,
        options: { chart: { height: 220 } }
      }
    ]
  }

  return (
    <AppReactApexCharts
      type='donut'
      height={220}
      width='100%'
      series={[counters.espacioOcupado, counters.espacioDisponible]}
      options={options}
    />
  )
}

export default OccupancyChart
