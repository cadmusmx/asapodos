'use client'

import dynamic from 'next/dynamic'

import type { ApexOptions } from 'apexcharts'

const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'))

type Props = {
  t: (key: string) => string
  data: {
    activos: number
    inactivos: number
    porDepto: Array<{ key: string; count: number }>
  }
}

const HumanCapitalChart = ({ t, data }: Props) => {
  const options: ApexOptions = {
    chart: {
      sparkline: { enabled: true }
    },
    colors: ['var(--mui-palette-primary-main)', 'var(--mui-palette-warning-main)'],
    stroke: { width: 0 },
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
    labels: [t('dashboard.general.active'), t('dashboard.general.inactive')],
    states: {
      hover: { filter: { type: 'none' } },
      active: { filter: { type: 'none' } }
    },
    plotOptions: {
      pie: {
        customScale: 0.9,
        donut: {
          size: '75%'
        }
      }
    }
  }

  return (
    <AppReactApexCharts
      type='donut'
      height={220}
      width='100%'
      series={[data.activos, data.inactivos]}
      options={options}
    />
  )
}

export default HumanCapitalChart
