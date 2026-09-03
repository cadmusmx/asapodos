'use client'

import dynamic from 'next/dynamic'

import { useTheme } from '@mui/material/styles'
import type { ApexOptions } from 'apexcharts'

const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'))

type DataItem = { bucket: string; count: number }

type Props = {
  t: (key: string) => string
  data: DataItem[]
}

const SeniorityChart = ({ t, data }: Props) => {
  const theme = useTheme()
  const order = ['Menos de 1 año', '1-3 años', '3-5 años', '5-10 años', 'Más de 10 años']
  const sortedData = [...data].sort((a, b) => order.indexOf(a.bucket) - order.indexOf(b.bucket))

  const options: ApexOptions = {
    chart: {
      parentHeightOffset: 0,
      toolbar: { show: false }
    },
    plotOptions: {
      bar: {
        borderRadius: 7,
        horizontal: false,
        columnWidth: '60%',
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
      padding: { left: -9, top: -20, bottom: 0 },
      borderColor: 'var(--mui-palette-divider)'
    },
    dataLabels: { enabled: false },
    colors: ['#0dcaf0', '#0d6efd', '#198754', '#6f42c1', '#fd7e14'],
    xaxis: {
      categories: sortedData.map(d => d.bucket),
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

export default SeniorityChart
