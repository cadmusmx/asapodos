'use client'

import dynamic from 'next/dynamic'

import { useTheme } from '@mui/material/styles'
import type { ApexOptions } from 'apexcharts'

const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'))

type DataItem = { key: string; count: number; km: number }

type Props = {
  t: (key: string) => string
  data: DataItem[]
}

const ByVehicleChart = ({ t, data }: Props) => {
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
              label: t('dashboard.fleets.total'),
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
      series={data.map(d => d.count)}
      options={options}
    />
  )
}

export default ByVehicleChart
