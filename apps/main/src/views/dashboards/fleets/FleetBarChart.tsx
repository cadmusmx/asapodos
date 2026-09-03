'use client'

import dynamic from 'next/dynamic'

import { useTheme } from '@mui/material/styles'
import type { ApexOptions } from 'apexcharts'

const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'))

type BarData = { key: string; count: number; monto: number }

type Props = {
  data: BarData[]
  title?: string
  height?: number
}

const FleetBarChart = ({ data, title, height = 220 }: Props) => {
  const theme = useTheme()

  const options: ApexOptions = {
    chart: { type: 'bar', height, toolbar: { show: false }, parentHeightOffset: 0 },
    plotOptions: { bar: { borderRadius: 7, horizontal: false, columnWidth: '60%' } },
    stroke: { width: 0 },
    colors: ['var(--mui-palette-primary-main)'],
    legend: { show: false },
    grid: {
      xaxis: { lines: { show: false } },
      strokeDashArray: 7,
      padding: { left: -9, top: -20, bottom: 13 },
      borderColor: 'var(--mui-palette-divider)'
    },
    dataLabels: { enabled: false },
    xaxis: {
      categories: data.map(d => d.key),
      tickPlacement: 'on',
      labels: { show: true, style: { colors: 'var(--mui-palette-text-disabled)', fontSize: '10px' } },
      axisTicks: { show: false },
      axisBorder: { show: false }
    },
    yaxis: {
      show: true,
      tickAmount: 4,
      labels: {
        offsetY: 2,
        offsetX: -10,
        formatter: val => {
          if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`
          if (val >= 1000) return `$${(val / 1000).toFixed(0)}K`

          return `$${val}`
        },
        style: { colors: 'var(--mui-palette-text-disabled)', fontSize: theme.typography.body2.fontSize as string }
      }
    },
    tooltip: {
      theme: 'light',
      y: {
        formatter: val =>
          new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(val)
      }
    }
  }

  return (
    <AppReactApexCharts
      type='bar'
      height={height}
      width='100%'
      series={[{ name: title || '', data: data.map(d => d.monto) }]}
      options={options}
    />
  )
}

export default FleetBarChart
