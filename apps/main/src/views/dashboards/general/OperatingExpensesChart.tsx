'use client'

import dynamic from 'next/dynamic'

import { useTheme } from '@mui/material/styles'
import type { ApexOptions } from 'apexcharts'

const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'))

type Props = {
  t: (key: string) => string
  data: Array<{ mes: string; year: string; aceptadas: number; rechazadas: number; pagadas: number }>
  height?: number
}

const OperatingExpensesChart = ({ t, data, height = 180 }: Props) => {
  const theme = useTheme()

  const months = data.map(d => d.mes)
  const aceptadas = data.map(d => d.aceptadas)
  const rechazadas = data.map(d => d.rechazadas)
  const pagadas = data.map(d => d.pagadas)

  const options: ApexOptions = {
    chart: {
      parentHeightOffset: 0,
      toolbar: { show: false }
    },
    plotOptions: {
      bar: {
        borderRadius: 4,
        columnWidth: '35%'
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
    colors: ['var(--mui-palette-success-main)', 'var(--mui-palette-error-main)', 'var(--mui-palette-info-main)'],
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
        { name: t('dashboard.general.approved'), data: aceptadas },
        { name: t('dashboard.general.rejected'), data: rechazadas },
        { name: t('dashboard.expenses.paid'), data: pagadas }
      ]}
      options={options}
    />
  )
}

export default OperatingExpensesChart
