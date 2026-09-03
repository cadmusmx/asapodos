'use client'

/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable padding-line-between-statements */
/* eslint-disable newline-before-return */

import dynamic from 'next/dynamic'

import { useTheme } from '@mui/material/styles'
import type { ApexOptions } from 'apexcharts'

const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'))

type MonthlyData = { month: string; year: string; type: string; count: number; monto: number }

type Props = {
  t: (key: string) => string
  data: MonthlyData[]
  height?: number
}

const PaymentsChart = ({ t, data, height = 220 }: Props) => {
  const theme = useTheme()

  const months = [...new Set(data.map(d => d.month))].sort((a, b) => {
    const order = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December'
    ]
    return order.indexOf(a) - order.indexOf(b)
  })

  const solicitado = months.map(month => {
    const item = data.find(d => d.month === month && d.type === 'Solicitado')
    return item ? Number(item.monto) : 0
  })

  const gastado = months.map(month => {
    const item = data.find(d => d.month === month && d.type === 'Gastado')
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
    legend: { show: true, position: 'bottom' },
    grid: {
      xaxis: { lines: { show: false } },
      strokeDashArray: 7,
      padding: { left: -9, top: -20, bottom: 13 },
      borderColor: 'var(--mui-palette-divider)'
    },
    dataLabels: { enabled: false },
    colors: ['var(--mui-palette-primary-main)', 'var(--mui-palette-warning-main)'],
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
      height={height}
      width='100%'
      series={[
        { name: t('dashboard.expenses.requestedVsSpent').split(' vs ')[0], data: solicitado },
        { name: t('dashboard.expenses.requestedVsSpent').split(' vs ')[1], data: gastado }
      ]}
      options={options}
    />
  )
}

export default PaymentsChart
