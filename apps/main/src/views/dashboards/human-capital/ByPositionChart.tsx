'use client'

import dynamic from 'next/dynamic'

import { useTheme } from '@mui/material/styles'
import type { ApexOptions } from 'apexcharts'

const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'))

type DataItem = { key: string; count: number }

type Props = {
  t: (key: string) => string
  data: DataItem[]
  height?: number
}

const ByPositionChart = ({ t, data, height = 220 }: Props) => {
  const theme = useTheme()

  const options: ApexOptions = {
    chart: {
      parentHeightOffset: 0,
      toolbar: { show: false }
    },
    plotOptions: {
      bar: {
        borderRadius: 7,
        horizontal: true,
        barHeight: '60%',
        distributed: true
      }
    },
    stroke: {
      width: 2,
      colors: ['var(--mui-palette-background-paper)']
    },
    legend: { show: false },
    grid: {
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: false } },
      padding: { top: -20, bottom: 13 },
      borderColor: 'var(--mui-palette-divider)'
    },
    dataLabels: { enabled: false },
    colors: [
      'var(--mui-palette-warning-main)',
      'rgba(var(--mui-palette-warning-mainChannel) / 0.8)',
      'rgba(var(--mui-palette-warning-mainChannel) / 0.6)',
      'rgba(var(--mui-palette-warning-mainChannel) / 0.4)',
      'var(--mui-palette-customColors-trackBg)'
    ],
    xaxis: {
      categories: data.map(d => d.key),
      tickPlacement: 'on',
      labels: {
        show: true,
        style: { colors: 'var(--mui-palette-text-disabled)', fontSize: theme.typography.body2.fontSize as string }
      },
      axisTicks: { show: false },
      axisBorder: { show: false }
    },
    yaxis: {
      show: true,
      labels: {
        offsetX: -17,
        style: { colors: 'var(--mui-palette-text-primary)', fontSize: theme.typography.body2.fontSize as string }
      }
    }
  }

  return (
    <AppReactApexCharts
      type='bar'
      height={height}
      width='100%'
      series={[{ name: t('dashboard.humanCapital.employees'), data: data.map(d => d.count) }]}
      options={options}
    />
  )
}

export default ByPositionChart
