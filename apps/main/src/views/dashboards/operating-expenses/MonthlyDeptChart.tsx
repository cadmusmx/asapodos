'use client'

import dynamic from 'next/dynamic'

import { useTheme } from '@mui/material/styles'
import type { ApexOptions } from 'apexcharts'

const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'))

type MonthlyDeptData = { month: string; year: string; dept: string; monto: number }

type Props = {
  data: MonthlyDeptData[]
  height?: number
}

const COLOR_PALETTE = [
  'var(--mui-palette-primary-main)',
  'var(--mui-palette-success-main)',
  'var(--mui-palette-warning-main)',
  'var(--mui-palette-error-main)',
  'var(--mui-palette-info-main)',
  'var(--mui-palette-secondary-main)',
  '#8b5cf6',
  '#06b6d4',
  '#f59e0b',
  '#ef4444'
]

const MonthlyDeptChart = ({ data, height = 310 }: Props) => {
  const theme = useTheme()

  const months = [...new Set(data.map(d => d.month))].sort((a, b) => {
    const order = [
      'Enero',
      'Febrero',
      'Marzo',
      'Abril',
      'Mayo',
      'Junio',
      'Julio',
      'Agosto',
      'Septiembre',
      'Octubre',
      'Noviembre',
      'Diciembre'
    ]

    return order.indexOf(a) - order.indexOf(b)
  })

  const departments = [...new Set(data.map(d => d.dept))].slice(0, 8)

  const series = departments.map(dept => ({
    name: dept,
    data: months.map(month => {
      const item = data.find(d => d.month === month && d.dept === dept)

      return item ? Number(item.monto) : 0
    })
  }))

  const options: ApexOptions = {
    chart: {
      type: 'line',
      height,
      toolbar: { show: false },
      zoom: { enabled: false },
      parentHeightOffset: 0
    },
    stroke: { curve: 'smooth', width: 2.5 },
    colors: COLOR_PALETTE.slice(0, departments.length),
    xaxis: {
      categories: months,
      tickPlacement: 'on',
      labels: { show: true, style: { colors: 'var(--mui-palette-text-disabled)', fontSize: '11px' } },
      axisTicks: { show: false },
      axisBorder: { show: false }
    },
    yaxis: {
      show: true,
      tickAmount: 5,
      labels: {
        offsetY: 2,
        formatter: val => {
          if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`
          if (val >= 1000) return `$${(val / 1000).toFixed(0)}K`

          return `$${val}`
        },
        style: { colors: 'var(--mui-palette-text-disabled)', fontSize: theme.typography.body2.fontSize as string }
      }
    },
    legend: {
      show: true,
      position: 'bottom',
      fontSize: '11px',
      labels: { colors: 'var(--mui-palette-text-secondary)' }
    },
    grid: {
      xaxis: { lines: { show: false } },
      strokeDashArray: 7,
      padding: { left: -9, top: -20, bottom: 13 },
      borderColor: 'var(--mui-palette-divider)'
    },
    tooltip: {
      shared: true,
      intersect: false,
      theme: 'light',
      y: {
        formatter: val =>
          new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(val)
      }
    },
    plotOptions: { bar: { borderRadius: 7, columnWidth: '40%' } },
    dataLabels: { enabled: false }
  }

  return <AppReactApexCharts type='line' height={height} width='100%' series={series} options={options} />
}

export default MonthlyDeptChart
