'use client'

import dynamic from 'next/dynamic'

import { useTheme } from '@mui/material/styles'
import type { ApexOptions } from 'apexcharts'

const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'))

type TopEmployee = { key: string; count: number }

type Props = {
  t: (key: string) => string
  data: TopEmployee[]
  height?: number
}

const TopEmployeesChart = ({ t, data, height = 220 }: Props) => {
  const theme = useTheme()

  const options: ApexOptions = {
    chart: {
      sparkline: { enabled: true }
    },
    colors: [
      'var(--mui-palette-warning-main)',
      'rgba(var(--mui-palette-warning-mainChannel) / 0.8)',
      'rgba(var(--mui-palette-warning-mainChannel) / 0.6)',
      'rgba(var(--mui-palette-warning-mainChannel) / 0.4)',
      'var(--mui-palette-customColors-trackBg)'
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
              formatter: value => value,
              color: 'var(--mui-palette-text-primary)'
            },
            total: {
              show: true,
              fontSize: '0.875rem',
              label: t('dashboard.projects.total'),
              color: 'var(--mui-palette-text-secondary)',
              formatter: () => `${data.reduce((acc, d) => acc + d.count, 0)}`
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
      height={height}
      width='100%'
      series={data.map(d => d.count)}
      options={options}
    />
  )
}

export default TopEmployeesChart
