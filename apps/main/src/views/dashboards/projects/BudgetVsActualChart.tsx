'use client'

import dynamic from 'next/dynamic'

import { useTheme } from '@mui/material/styles'
import type { ApexOptions } from 'apexcharts'

const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'))

type ProjectItem = {
  id: number
  nombre: string
  presupuesto: number
  gasto: number
  porcentaje?: number
  estado?: 'onBudget' | 'exceeding' | 'exceeded'
}

type Props = {
  t: (key: string) => string
  data: ProjectItem[]
  height?: number
}

const BudgetVsActualChart = ({ t, data, height = 220 }: Props) => {
  const theme = useTheme()

  const options: ApexOptions = {
    chart: {
      parentHeightOffset: 0,
      toolbar: { show: false }
    },
    plotOptions: {
      bar: {
        borderRadius: 7,
        horizontal: true,
        barHeight: '40%'
      }
    },
    stroke: {
      width: 0
    },
    legend: { show: true, position: 'bottom' },
    grid: {
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: false } },
      padding: { top: -20, bottom: 13 },
      borderColor: 'var(--mui-palette-divider)'
    },
    dataLabels: { enabled: false },
    colors: ['var(--mui-palette-success-main)', 'var(--mui-palette-warning-main)', 'var(--mui-palette-error-main)'],
    xaxis: {
      categories: data.map(d => d.nombre.substring(0, 20) + (d.nombre.length > 20 ? '...' : '')),
      tickPlacement: 'on',
      labels: {
        show: true,
        style: { colors: 'var(--mui-palette-text-disabled)', fontSize: theme.typography.body2.fontSize as string },
        formatter: (value: string | number) => `$${Number(value) > 999 ? `${(Number(value) / 1000).toFixed(0)}k` : value}`
      },
      axisTicks: { show: false },
      axisBorder: { show: false }
    },
    yaxis: {
      show: true,
      labels: {
        offsetX: -17,
        style: { colors: 'var(--mui-palette-text-primary)', fontSize: theme.typography.body2.fontSize as string }
      }
    }
  }

  return (
    <AppReactApexCharts
      type='bar'
      height={height}
      width='100%'
      series={[
        { name: t('dashboard.projects.budget'), data: data.map(d => d.presupuesto) },
        { name: t('dashboard.projects.spent'), data: data.map(d => d.gasto) }
      ]}
      options={options}
    />
  )
}

export default BudgetVsActualChart
