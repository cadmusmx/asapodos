'use client'

import dynamic from 'next/dynamic'

import { useTheme } from '@mui/material/styles'
import type { ApexOptions } from 'apexcharts'

const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'))

type ProjectItem = {
  id: number
  nombre: string
  cliente: string
  presupuesto: number
  gasto: number
  margen: number | null
  responsable: string
  estatus: number
}

type Props = {
  t: (key: string) => string
  data: ProjectItem[]
  height?: number
}

const TotalExpenseByProjectChart = ({ t, data, height = 220 }: Props) => {
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
        columnWidth: '60%'
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
      padding: { left: -9, top: -20, bottom: 13 },
      borderColor: 'var(--mui-palette-divider)'
    },
    dataLabels: { enabled: false },
    colors: ['var(--mui-palette-primary-main)'],
    xaxis: {
      categories: data.map(d => d.nombre.substring(0, 15) + (d.nombre.length > 15 ? '...' : '')),
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
      series={[{ name: t('dashboard.projects.spent'), data: data.map(d => d.gasto) }]}
      options={options}
    />
  )
}

export default TotalExpenseByProjectChart
