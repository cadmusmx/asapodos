'use client'

import dynamic from 'next/dynamic'

import type { ApexOptions } from 'apexcharts'

const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'))

type Props = {
  t: (key: string) => string
  data: {
    aceptadas: number
    pendientes: number
    rechazadas: number
  }
}

const CotizacionesChart = ({ t, data }: Props) => {
  const options: ApexOptions = {
    chart: {
      sparkline: { enabled: true }
    },
    colors: ['var(--mui-palette-success-main)', 'var(--mui-palette-warning-main)', 'var(--mui-palette-error-main)'],
    stroke: { width: 3, colors: ['var(--mui-palette-background-paper)'] },
    legend: { show: false },
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
    labels: [t('dashboard.general.approved'), t('dashboard.general.pending'), t('dashboard.general.rejected')],
    states: {
      hover: { filter: { type: 'none' } },
      active: { filter: { type: 'none' } }
    },
    plotOptions: {
      pie: {
        customScale: 0.9,
        donut: {
          size: '75%',
          labels: {
            show: true,
            name: {
              show: false
            },
            value: {
              offsetY: -15,
              fontWeight: 500,
              fontSize: '18px',
              formatter: (value: string) => value,
              color: 'var(--mui-palette-text-primary)'
            },
            total: {
              show: true,
              fontSize: '0.75rem',
              label: t('dashboard.general.total'),
              color: 'var(--mui-palette-text-secondary)',
              formatter: () => `${data.aceptadas + data.pendientes + data.rechazadas}`
            }
          }
        }
      }
    }
  }

  return (
    <AppReactApexCharts
      type='donut'
      height={220}
      width='100%'
      series={[data.aceptadas, data.pendientes, data.rechazadas]}
      options={options}
    />
  )
}

export default CotizacionesChart
