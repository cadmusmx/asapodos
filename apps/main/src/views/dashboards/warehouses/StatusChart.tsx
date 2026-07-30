'use client'

import dynamic from 'next/dynamic'

import { useTheme } from '@mui/material/styles'
import type { ApexOptions } from 'apexcharts'

const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'))

type Props = {
  t: (key: string) => string
  data: { operativos: number; inoperativos: number }
}

const StatusChart = ({ t, data }: Props) => {
  const theme = useTheme()

  const options: ApexOptions = {
    chart: {
      sparkline: { enabled: true }
    },
    colors: ['var(--mui-palette-success-main)', 'var(--mui-palette-text-disabled)'],
    stroke: { width: 0 },
    legend: { show: true, position: 'bottom' },
    tooltip: { theme: 'false' },
    dataLabels: { enabled: false },
    labels: [t('dashboard.warehouses.operational'), t('dashboard.warehouses.inactive')],
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
              label: t('dashboard.warehouses.totalWarehouses'),
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
      series={[data.operativos, data.inoperativos]}
      options={options}
    />
  )
}

export default StatusChart
