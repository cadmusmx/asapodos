'use client'

/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable padding-line-between-statements */
/* eslint-disable newline-before-return */

import dynamic from 'next/dynamic'

import { useTheme } from '@mui/material/styles'
import type { ApexOptions } from 'apexcharts'

const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'))

type MonthlyData = { month: string; year: string; count: number; monto: number }

type Props = {
  t: (key: string) => string
  data: MonthlyData[]
}

const FuelConsumptionChart = ({ t, data }: Props) => {
  const theme = useTheme()

  const months = [...new Set(data.map(d => d.month))].sort((a, b) => {
    const order = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    return order.indexOf(a) - order.indexOf(b)
  })

  const montos = months.map(month => {
    const item = data.find(d => d.month === month)
    return item ? Number(item.monto) : 0
  })

  const options: ApexOptions = {
    chart: {
      parentHeightOffset: 0,
      toolbar: { show: false }
    },
    plotOptions: {
      bar: {
        borderRadius: 7,
        columnWidth: '40%'
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
    colors: ['var(--mui-palette-warning-main)'],
    xaxis: {
      categories: months,
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
        style: { colors: 'var(--mui-palette-text-disabled)', fontSize: theme.typography.body2.fontSize as string },
        formatter: value => `$${value > 999 ? `${(value / 1000).toFixed(0)}k` : value}`
      }
    }
  }

  return (
    <AppReactApexCharts
      type='bar'
      height={220}
      width='100%'
      series={[{ name: t('dashboard.fleets.fuelConsumption'), data: montos }]}
      options={options}
    />
  )
}

export default FuelConsumptionChart
