'use client'

import dynamic from 'next/dynamic'

import { useTheme } from '@mui/material/styles'
import type { ApexOptions } from 'apexcharts'

const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'))

type DataItem = { key: string; count: number }

type Props = {
  t: (key: string) => string
  data: DataItem[]
}

const ByRegionChart = ({ t, data }: Props) => {
  const theme = useTheme()
  const sortedData = [...data].sort((a, b) => a.key.localeCompare(b.key))

  const options: ApexOptions = {
    chart: {
      parentHeightOffset: 0,
      toolbar: { show: false }
    },
    plotOptions: {
      bar: {
        borderRadius: 7,
        horizontal: false,
        columnWidth: '50%',
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
      strokeDashArray: 7,
      padding: { left: -9, top: -20, bottom: 0 },
      borderColor: 'var(--mui-palette-divider)'
    },
    dataLabels: { enabled: false },
    colors: [
      '#0d6efd',
      '#198754',
      '#dc3545',
      '#ffc107',
      '#0dcaf0',
      '#6f42c1',
      '#fd7e14'
    ],
    xaxis: {
      categories: sortedData.map(d => d.key),
      tickPlacement: 'on',
      labels: {
        show: true,
        style: { colors: 'var(--mui-palette-text-secondary)', fontSize: '11px' }
      },
      axisTicks: { show: false },
      axisBorder: { show: false }
    },
    yaxis: {
      show: true,
      tickAmount: 4,
      labels: {
        offsetY: 2,
        offsetX: -17,
        style: { colors: 'var(--mui-palette-text-disabled)', fontSize: theme.typography.body2.fontSize as string }
      }
    }
  }

  return (
    <AppReactApexCharts
      type='bar'
      height={220}
      width='100%'
      series={[{ name: t('dashboard.humanCapital.employees'), data: sortedData.map(d => d.count) }]}
      options={options}
    />
  )
}

export default ByRegionChart
