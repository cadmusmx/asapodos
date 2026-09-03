'use client'

import dynamic from 'next/dynamic'

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import type { ApexOptions } from 'apexcharts'

const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'))

type Props = {
  t: (key: string) => string
  data: Array<{ key: string; count: number }>
  height?: number
}

const HumanCapitalDeptChart = ({ t, data, height = 180 }: Props) => {
  const options: ApexOptions = {
    chart: {
      sparkline: { enabled: true }
    },
    colors: [
      '#0d6efd',
      '#198754',
      '#dc3545',
      '#ffc107',
      '#0dcaf0',
      '#6f42c1',
      '#fd7e14',
      '#20c997',
      '#d63384',
      '#6610f2'
    ],
    stroke: { width: 0 },
    legend: { show: false },
    tooltip: {
      custom: ({ series, seriesIndex, w }) => {
        const label = w.globals.labels[seriesIndex] as string
        const value = series[seriesIndex] as number
        const total = (series as number[]).reduce((a, b) => a + b, 0)
        const pct = ((value / total) * 100).toFixed(1)

        return `<div style="padding:8px 12px;background:var(--mui-palette-background-paper);color:var(--mui-palette-text-primary);border-radius:8px;font-size:13px;border:1px solid var(--mui-palette-divider);">
          <strong>${label}</strong><br/>
          ${value.toLocaleString()} empleados (${pct}%)
        </div>`
      }
    },
    dataLabels: { enabled: false },
    labels: data.map(d => d.key),
    states: {
      hover: { filter: { type: 'none' } },
      active: { filter: { type: 'none' } }
    },
    plotOptions: {
      pie: {
        customScale: 0.85,
        donut: {
          size: '75%',
          labels: {
            show: true,
            name: { show: false },
            value: {
              offsetY: 5,
              fontWeight: 700,
              fontSize: '22px',
              formatter: (value: string) => Number(value).toLocaleString(),
              color: 'var(--mui-palette-text-primary)'
            },
            total: {
              show: true,
              fontSize: '12px',
              fontWeight: 600,
              label: t('dashboard.general.total'),
              color: 'var(--mui-palette-text-secondary)',
              formatter: () => {
                const total = data.reduce((acc, d) => acc + d.count, 0)

                return total.toLocaleString()
              }
            }
          }
        }
      }
    }
  }

  if (!data || data.length === 0) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height }}>
        <Typography variant='body2' color='text.secondary'>
          Sin datos
        </Typography>
      </Box>
    )
  }

  return (
    <AppReactApexCharts type='donut' height={height} width='100%' series={data.map(d => d.count)} options={options} />
  )
}

export default HumanCapitalDeptChart
