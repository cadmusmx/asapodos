'use client'

import dynamic from 'next/dynamic'

import { useTheme } from '@mui/material/styles'
import type { ApexOptions } from 'apexcharts'

const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'))

type ProjectItem = {
  id: number
  nombre: string
  margen: number | null
}

type Props = {
  t: (key: string) => string
  data: ProjectItem[]
}

const ProfitabilityChart = ({ t, data }: Props) => {
  const theme = useTheme()

  const filteredData = data.filter(p => p.margen !== null).slice(0, 10)

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
    colors: filteredData.map(p => (p.margen !== null && p.margen >= 40 ? 'var(--mui-palette-success-main)' : 'var(--mui-palette-warning-main)')),
    xaxis: {
      categories: filteredData.map(d => d.nombre.substring(0, 15) + (d.nombre.length > 15 ? '...' : '')),
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
        formatter: value => `${value}%`
      }
    }
  }

  return (
    <AppReactApexCharts
      type='bar'
      height={220}
      width='100%'
      series={[{ name: t('dashboard.projects.profitability'), data: filteredData.map(d => d.margen ?? 0) }]}
      options={options}
    />
  )
}

export default ProfitabilityChart
