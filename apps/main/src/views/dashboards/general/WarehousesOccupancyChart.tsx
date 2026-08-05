'use client'

import dynamic from 'next/dynamic'

import { useTheme } from '@mui/material/styles'
import type { ApexOptions } from 'apexcharts'

const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'))

type Props = {
  t: (key: string) => string
  data: Array<{ almacen: string; capacidad: number; ocupado: number }>
  height?: number
}

const WarehousesOccupancyChart = ({ t, data, height = 180 }: Props) => {
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
        barHeight: '60%'
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
    colors: ['var(--mui-palette-info-main)', 'var(--mui-palette-warning-main)'],
    xaxis: {
      categories: data.map(d => d.almacen.length > 15 ? d.almacen.substring(0, 15) + '...' : d.almacen),
      tickPlacement: 'on',
      labels: {
        show: true,
        style: { colors: 'var(--mui-palette-text-disabled)', fontSize: theme.typography.body2.fontSize as string },
        formatter: (value: string | number) => `${value}m²`
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
        { name: t('dashboard.warehouses.capacity'), data: data.map(d => d.capacidad) },
        { name: t('dashboard.warehouses.occupied'), data: data.map(d => d.ocupado) }
      ]}
      options={options}
    />
  )
}

export default WarehousesOccupancyChart
