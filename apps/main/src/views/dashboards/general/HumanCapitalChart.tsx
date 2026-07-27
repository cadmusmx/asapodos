'use client'

import dynamic from 'next/dynamic'

import type { ApexOptions } from 'apexcharts'

const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'))

type Props = {
  t: (key: string) => string
  data: {
    activos: number
    inactivos: number
    porDepto: Array<{ key: string; count: number }>
  }
}

const HumanCapitalChart = ({ t, data }: Props) => {
  const options: ApexOptions = {
    chart: {
      sparkline: { enabled: true }
    },
    colors: ['var(--mui-palette-primary-main)', 'rgba(var(--mui-palette-primary-mainChannel) / 0.7)'],
    stroke: { width: 0 },
    legend: { show: false },
    tooltip: { theme: 'false' },
    dataLabels: { enabled: false },
    labels: [t('dashboard.general.active'), t('dashboard.general.inactive')],
    states: {
      hover: { filter: { type: 'none' } },
      active: { filter: { type: 'none' } }
    },
    plotOptions: {
      pie: {
        customScale: 0.9,
        donut: {
          size: '75%'
        }
      }
    }
  }

  return (
    <AppReactApexCharts
      type='donut'
      height={220}
      width='100%'
      series={[data.activos, data.inactivos]}
      options={options}
    />
  )
}

export default HumanCapitalChart
