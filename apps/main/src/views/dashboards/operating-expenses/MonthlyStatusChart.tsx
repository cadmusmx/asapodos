'use client'

import dynamic from 'next/dynamic'

import { useTheme } from '@mui/material/styles'
import type { ApexOptions } from 'apexcharts'

const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'))

type MonthlyStatusData = { month: string; year: string; status: string; monto: number }

type Props = {
  data: MonthlyStatusData[]
  height?: number
}

const STATUS_COLORS: Record<string, string> = {
  'Aceptada': 'var(--mui-palette-success-main)',
  'Rechazada': 'var(--mui-palette-error-main)',
  'Pagada': 'var(--mui-palette-info-main)',
  'Facturada': 'var(--mui-palette-success-light)',
  'Pendiente': 'var(--mui-palette-warning-main)'
}

const MonthlyStatusChart = ({ data, height = 310 }: Props) => {
  const theme = useTheme()

  const months = [...new Set(data.map(d => d.month))].sort((a, b) => {
    const order = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
    return order.indexOf(a) - order.indexOf(b)
  })

  const statuses = [...new Set(data.map(d => d.status))]

  const series = statuses.map((status) => ({
    name: status,
    data: months.map((month) => {
      const item = data.find(d => d.month === month && d.status === status)
      return item ? Number(item.monto) : 0
    })
  }))

  const options: ApexOptions = {
    chart: {
      type: 'bar',
      height,
      toolbar: { show: false },
      stacked: false,
      parentHeightOffset: 0
    },
    plotOptions: {
      bar: { borderRadius: 7, columnWidth: '50%' }
    },
    stroke: { width: 0 },
    colors: statuses.map(s => STATUS_COLORS[s] || 'var(--mui-palette-primary-main)'),
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
        formatter: (val) => {
          if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`
          if (val >= 1000) return `$${(val / 1000).toFixed(0)}K`
          return `$${val}`
        },
        style: { colors: 'var(--mui-palette-text-disabled)', fontSize: theme.typography.body2.fontSize as string }
      }
    },
    legend: { show: true, position: 'bottom', fontSize: '11px', labels: { colors: 'var(--mui-palette-text-secondary)' } },
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
      y: { formatter: (val) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(val) }
    },
    dataLabels: { enabled: false }
  }

  return <AppReactApexCharts type='bar' height={height} width='100%' series={series} options={options} />
}

export default MonthlyStatusChart
