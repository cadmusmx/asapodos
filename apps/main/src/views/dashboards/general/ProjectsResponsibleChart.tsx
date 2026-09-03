'use client'

import dynamic from 'next/dynamic'

import type { ApexOptions } from 'apexcharts'

const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'))

type Props = {
  t: (key: string) => string
  data: Array<{ key: string; count: number }>
  height?: number
}

const ProjectsResponsibleChart = ({ t, data, height = 180 }: Props) => {
  const options: ApexOptions = {
    chart: {
      sparkline: { enabled: true }
    },
    colors: [
      'var(--mui-palette-primary-main)',
      'var(--mui-palette-success-main)',
      'var(--mui-palette-warning-main)',
      'var(--mui-palette-error-main)',
      'var(--mui-palette-info-main)',
      'var(--mui-palette-secondary-main)',
      'var(--mui-palette-purple-main)',
      'var(--mui-palette-orange-main)',
      'var(--mui-palette-cyan-main)',
      'var(--mui-palette-pink-main)'
    ],
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
    labels: data.map(d => d.key),
    states: {
      hover: { filter: { type: 'none' } },
      active: { filter: { type: 'none' } }
    },
    plotOptions: {
      pie: {
        customScale: 0.85,
        donut: {
          size: '70%',
          labels: {
            show: true,
            name: {
              offsetY: 20,
              fontSize: '0.75rem',
              color: 'var(--mui-palette-text-secondary)'
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
              formatter: () => `${data.reduce((acc, d) => acc + d.count, 0)}`
            }
          }
        }
      }
    }
  }

  return (
    <AppReactApexCharts type='donut' height={height} width='100%' series={data.map(d => d.count)} options={options} />
  )
}

export default ProjectsResponsibleChart
