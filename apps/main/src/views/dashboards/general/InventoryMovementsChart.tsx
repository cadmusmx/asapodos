'use client'

import dynamic from 'next/dynamic'

import { useTheme } from '@mui/material/styles'
import type { ApexOptions } from 'apexcharts'

const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'))

type Props = {
  t: (key: string) => string
  data: Array<{ mes: string; arribos: number; salidas: number; sitiosAtt: number; sitiosTelcel: number }>
  height?: number
}

const InventoryMovementsChart = ({ t, data, height = 180 }: Props) => {
  const theme = useTheme()

  const months = data.map(d => d.mes)
  const arribos = data.map(d => d.arribos)
  const salidas = data.map(d => d.salidas)

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
    colors: ['var(--mui-palette-info-main)', 'var(--mui-palette-warning-main)'],
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
        { name: t('dashboard.warehouses.arrivals'), data: arribos },
        { name: t('dashboard.warehouses.outputs'), data: salidas }
      ]}
      options={options}
    />
  )
}

export default InventoryMovementsChart
