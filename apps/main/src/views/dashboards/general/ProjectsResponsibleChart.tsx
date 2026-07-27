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
      'rgba(var(--mui-palette-primary-mainChannel) / 0.8)',
      'rgba(var(--mui-palette-primary-mainChannel) / 0.6)',
      'rgba(var(--mui-palette-primary-mainChannel) / 0.4)',
      'rgba(var(--mui-palette-primary-mainChannel) / 0.3)',
      'rgba(var(--mui-palette-primary-mainChannel) / 0.2)',
      'rgba(var(--mui-palette-primary-mainChannel) / 0.15)',
      'rgba(var(--mui-palette-primary-mainChannel) / 0.1)',
      'rgba(var(--mui-palette-primary-mainChannel) / 0.08)',
      'rgba(var(--mui-palette-primary-mainChannel) / 0.05)'
    ],
    stroke: { width: 0 },
    legend: { show: false },
    tooltip: { theme: 'false' },
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
    <AppReactApexCharts
      type='donut'
      height={height}
      width='100%'
      series={data.map(d => d.count)}
      options={options}
    />
  )
}

export default ProjectsResponsibleChart
