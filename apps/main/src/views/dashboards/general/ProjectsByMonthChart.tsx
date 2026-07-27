'use client'

import dynamic from 'next/dynamic'

import { useTheme } from '@mui/material/styles'
import type { ApexOptions } from 'apexcharts'

const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'))

type Props = {
  t: (key: string) => string
  data: Array<{ mes: string; year: string; status: string; count: number }>
  height?: number
}

const ProjectsByMonthChart = ({ t, data, height = 180 }: Props) => {
  const theme = useTheme()

  const months = [...new Set(data.map(d => d.mes))].sort((a, b) => {
    const order = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

    return order.indexOf(a) - order.indexOf(b)
  })

  const activos = months.map(month => {
    const item = data.find(d => d.mes === month && d.status === 'Activos')

    return item ? item.count : 0
  })

  const cerrados = months.map(month => {
    const item = data.find(d => d.mes === month && d.status === 'Cerrados')

    return item ? item.count : 0
  })

  const options: ApexOptions = {
    chart: {
      parentHeightOffset: 0,
      toolbar: { show: false }
    },
    plotOptions: {
      bar: {
        borderRadius: 4,
        columnWidth: '40%'
      }
    },
    stroke: {
      width: 2,
      colors: ['var(--mui-palette-background-paper)']
    },
    legend: { show: true, position: 'bottom' },
    grid: {
      xaxis: { lines: { show: false } },
      strokeDashArray: 7,
      padding: { left: -9, top: -20, bottom: 13 },
      borderColor: 'var(--mui-palette-divider)'
    },
    dataLabels: { enabled: false },
    colors: ['var(--mui-palette-success-main)', 'var(--mui-palette-warning-main)'],
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
        style: { colors: 'var(--mui-palette-text-disabled)', fontSize: theme.typography.body2.fontSize as string }
      }
    }
  }

  return (
    <AppReactApexCharts
      type='bar'
      height={height}
      width='100%'
      series={[
        { name: t('dashboard.projects.active'), data: activos },
        { name: t('dashboard.projects.closed'), data: cerrados }
      ]}
      options={options}
    />
  )
}

export default ProjectsByMonthChart
