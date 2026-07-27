'use client'

import dynamic from 'next/dynamic'

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import type { ApexOptions } from 'apexcharts'

const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'))

type DataItem = { key: string; count: number }

type Props = {
  t: (key: string) => string
  data: DataItem[]
}

const GenderDistributionChart = ({ t, data }: Props) => {
  const options: ApexOptions = {
    chart: {
      sparkline: { enabled: true }
    },
    colors: ['#979797', '#0d6efd', '#f399dc'],
    stroke: { width: 0 },
    legend: { show: true, position: 'bottom' },
    tooltip: {
      custom: ({ series, seriesIndex, w }) => {
        const label = w.globals.labels[seriesIndex] as string
        const value = series[seriesIndex] as number
        const total = (series as number[]).reduce((a, b) => a + b, 0)
        const pct = ((value / total) * 100).toFixed(1)


        return `<div style="padding:8px 12px;background:#1f2937;color:#fff;border-radius:8px;font-size:13px;">
          <strong>${label}</strong><br/>
          ${value.toLocaleString()} (${pct}%)
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
              formatter: (value: string) => Number(value).toLocaleString(),
              color: 'var(--mui-palette-text-primary)'
            },
            total: {
              show: true,
              fontSize: '0.875rem',
              label: t('dashboard.humanCapital.total'),
              color: 'var(--mui-palette-text-secondary)',
              formatter: () => `${data.reduce((acc, d) => acc + d.count, 0)}`
            }
          }
        }
      }
    }
  }

  if (!data || data.length === 0) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 220 }}>
        <Typography variant='body2' color='text.secondary'>Sin datos</Typography>
      </Box>
    )
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

export default GenderDistributionChart
