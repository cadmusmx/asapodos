'use client'

import dynamic from 'next/dynamic'

import { useTheme } from '@mui/material/styles'
import type { ApexOptions } from 'apexcharts'

const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'))

type FacturadoData = { key: string; count: number; importe: number; facturada: number; pagada: number }

type Props = {
  t: (key: string) => string
  data: FacturadoData[]
  height?: number
}

const STATUS_COLORS: Record<string, string> = {
  'Facturada': '#198754',
  'Pagada': '#0d6efd',
  'Aceptada': '#6c757d',
  'Pendiente': '#ffc107',
  'Rechazada': '#dc3545'
}

const fmtMXN = (val: number) => {
  if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`
  if (val >= 1000) return `$${(val / 1000).toFixed(0)}K`
  return `$${val}`
}

const StatusPieChart = ({ t, data, height = 220 }: Props) => {
  const theme = useTheme()

  const options: ApexOptions = {
    chart: { type: 'donut', height, toolbar: { show: false }, sparkline: { enabled: false } },
    colors: data.map(d => STATUS_COLORS[d.key] || 'var(--mui-palette-primary-main)'),
    stroke: { width: 0 },
    legend: { show: true, position: 'bottom', fontSize: '11px', labels: { colors: 'var(--mui-palette-text-secondary)' } },
    tooltip: {
      custom: ({ series, seriesIndex, w }) => {
        const label = w.globals.labels[seriesIndex] as string
        const value = series[seriesIndex] as number
        const total = (series as number[]).reduce((a, b) => a + b, 0)
        const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0'
        const fmt = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(value)
        return `<div style="padding:8px 12px;background:var(--mui-palette-background-paper);color:var(--mui-palette-text-primary);border-radius:8px;font-size:13px;border:1px solid var(--mui-palette-divider);">
          <strong>${label}</strong><br/>${fmt} (${pct}%)</div>`
      }
    },
    dataLabels: { enabled: false },
    labels: data.map(d => d.key),
    states: { hover: { filter: { type: 'none' } }, active: { filter: { type: 'none' } } },
    plotOptions: {
      pie: {
        customScale: 0.9,
        donut: {
          size: '70%',
          labels: {
            show: true,
            name: { offsetY: 25, fontSize: '0.875rem', color: 'var(--mui-palette-text-secondary)' },
            value: {
              offsetY: -15,
              fontWeight: 500,
              fontSize: '24px',
              formatter: (val) => fmtMXN(Number(val)),
              color: 'var(--mui-palette-text-primary)'
            },
            total: {
              show: true,
              fontSize: '0.875rem',
              label: t('dashboard.expenses.total'),
              color: 'var(--mui-palette-text-secondary)',
              formatter: (value) => {
                const total = (value as any)?.globals?.seriesTotals?.reduce((a: number, b: number) => a + b, 0) || 0
                return fmtMXN(total)
              }
            }
          }
        }
      }
    },
    responsive: [
      { breakpoint: 1300, options: { chart: { height: 257 } } },
      { breakpoint: theme.breakpoints.values.lg, options: { chart: { height: 276 } } }
    ]
  }

  return <AppReactApexCharts type='donut' height={height} width='100%' series={data.map(d => d.importe)} options={options} />
}

export default StatusPieChart
