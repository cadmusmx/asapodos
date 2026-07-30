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

const PaymentTypeChart = ({ t, data }: Props) => {
  const theme = useTheme()

  const options: ApexOptions = {
    chart: {
      sparkline: { enabled: true }
    },
    colors: ['var(--mui-palette-primary-main)', 'var(--mui-palette-purple-main)'],
    stroke: { width: 0 },
    legend: { show: true, position: 'bottom' },
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

export default PaymentTypeChart
