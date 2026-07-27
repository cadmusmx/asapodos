'use client'

import dynamic from 'next/dynamic'

import type { ApexOptions } from 'apexcharts'

const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'))

type Props = {
  t: (key: string) => string
  data: {
    aceptadas: number
    pendientes: number
    rechazadas: number
  }
}

const CotizacionesChart = ({ t, data }: Props) => {
  const options: ApexOptions = {
    chart: {
      sparkline: { enabled: true }
    },
    colors: [
      'var(--mui-palette-success-main)',
      'var(--mui-palette-warning-main)',
      'var(--mui-palette-error-main)'
    ],
    stroke: { width: 0 },
    legend: { show: false },
    tooltip: { theme: 'false' },
    dataLabels: { enabled: false },
    labels: [t('dashboard.general.approved'), t('dashboard.general.pending'), t('dashboard.general.rejected')],
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
      series={[data.aceptadas, data.pendientes, data.rechazadas]}
      options={options}
    />
  )
}

export default CotizacionesChart
