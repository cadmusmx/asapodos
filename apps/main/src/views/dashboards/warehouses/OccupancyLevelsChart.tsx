'use client'

/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable padding-line-between-statements */
/* eslint-disable newline-before-return */

import dynamic from 'next/dynamic'

import { useTheme } from '@mui/material/styles'
import type { ApexOptions } from 'apexcharts'

const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'))

type DataItem = { level: string; count: number }

type Props = {
  t: (key: string) => string
  data: DataItem[]
}

const levelColors: Record<string, string> = {
  NORMAL: 'var(--mui-palette-success-main)',
  MEDIO: 'var(--mui-palette-info-main)',
  ALTO: 'var(--mui-palette-warning-main)',
  CRITICO: 'var(--mui-palette-error-main)'
}

const OccupancyLevelsChart = ({ t, data }: Props) => {
  const theme = useTheme()

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
      width: 0
    },
    legend: { show: false },
    grid: {
      xaxis: { lines: { show: false } },
      strokeDashArray: 7,
      padding: { left: -9, top: -20, bottom: 13 },
      borderColor: 'var(--mui-palette-divider)'
    },
    dataLabels: { enabled: false },
    colors: data.map(d => levelColors[d.level] || 'var(--mui-palette-primary-main)'),
    xaxis: {
      categories: data.map(d => {
        const key = `dashboard.warehouses.${d.level.toLowerCase()}`
        return t(key)
      }),
      tickPlacement: 'on',
      labels: { show: false },
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
      series={[{ name: t('dashboard.warehouses.totalWarehouses'), data: data.map(d => d.count) }]}
      options={options}
    />
  )
}

export default OccupancyLevelsChart
