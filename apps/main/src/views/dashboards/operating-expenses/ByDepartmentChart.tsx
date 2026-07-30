'use client'

import dynamic from 'next/dynamic'

import { useTheme } from '@mui/material/styles'
import type { ApexOptions } from 'apexcharts'

const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'))

type DataItem = { key: string; count: number; monto?: number }

type Props = {
  t: (key: string) => string
  data: DataItem[]
}

const ByDepartmentChart = ({ t, data }: Props) => {
  const theme = useTheme()

  const options: ApexOptions = {
    chart: {
      sparkline: { enabled: true }
    },
    colors: [
      'var(--mui-palette-primary-main)',
      'rgba(var(--mui-palette-primary-mainChannel) / 0.7)',
      'rgba(var(--mui-palette-primary-mainChannel) / 0.5)',
      'rgba(var(--mui-palette-primary-mainChannel) / 0.3)',
      'var(--mui-palette-customColors-trackBg)',
      'var(--mui-palette-secondary-main)'
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
              label: t('dashboard.expenses.total'),
              color: 'var(--mui-palette-text-secondary)',
              formatter: value => `${value.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0)}`
            }
          }
        }
      }
    },
    responsive: [
      {
        breakpoint: 1300,
        options: { chart: { height: 257 } }
      },
      {
        breakpoint: theme.breakpoints.values.lg,
        options: { chart: { height: 276 } }
      }
    ]
  }

  return (
    <AppReactApexCharts
      type='donut'
      height={220}
      width='100%'
      series={data.map(d => d.count)}
      options={options}
    />
  )
}

export default ByDepartmentChart
