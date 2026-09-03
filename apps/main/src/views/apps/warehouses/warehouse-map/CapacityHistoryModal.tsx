'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

import dynamic from 'next/dynamic'

import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Select from '@mui/material/Select'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import _Skeleton from '@mui/material/Skeleton'
import { styled } from '@mui/material/styles'


import type {
  CapacityHistoryApiResponse,
  CapacityHistoryItem,
  HistoryPreset,
  HistoryGroup
} from '@/types/warehouse-map'
import {
  applyPreset,
  applyRange,
  groupSeries,
  labelOf
} from './warehouse-map-utils'

const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'), { ssr: false })

type Props = {
  open: boolean
  warehouseName: string
  onClose: () => void
  t: (key: string) => string
}

const GradientDialog = styled(Dialog)(({ theme: _theme }) => ({
  '& .MuiDialogTitle-root': {
    background: 'linear-gradient(135deg, #004080, #0099cc)',
    color: 'white'
  }
}))

const CapacityHistoryModal = ({ open, warehouseName, onClose, t }: Props) => {
  const [_isLoading, _setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(false)
  const [rawData, setRawData] = useState<CapacityHistoryItem[]>([])
  const [_capacidadTotal, setCapacidadTotal] = useState(100)
  const [_error, setError] = useState<string | null>(null)
  const [preset, setPreset] = useState<HistoryPreset>('last4')
  const [group, setGroup] = useState<HistoryGroup>('day')
  const [rangeStart, setRangeStart] = useState('')
  const [rangeEnd, setRangeEnd] = useState('')
  const [summary, setSummary] = useState('')
  const chartRef = useRef<{ chart?: { dataURI: () => Promise<string> } }>({})

  const fetchData = useCallback(async () => {
    setIsFetching(true)
    setError(null)

    try {
      const res = await fetch(`/api/warehouses/map/capacity-history?almacen=${encodeURIComponent(warehouseName)}`)

      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json: CapacityHistoryApiResponse = await res.json()

      if (!json.ok) throw new Error('API error')
      setRawData(json.data)
      setCapacidadTotal(json.capacidadTotal)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsFetching(false)
    }
  }, [warehouseName])

  useEffect(() => {
    if (open && warehouseName) {
      setPreset('last4')
      setGroup('day')
      setRangeStart('')
      setRangeEnd('')
      fetchData()
    }
  }, [open, warehouseName, fetchData])

  const effectiveGroup = preset === 'last4' ? 'raw' : group
  const range = rangeStart && rangeEnd ? { start: new Date(rangeStart), end: new Date(rangeEnd) } : null
  const filtered1 = applyPreset(rawData, preset)
  const filtered2 = applyRange(filtered1, range)
  const grouped = groupSeries(filtered2, effectiveGroup)

  useEffect(() => {
    if (grouped.length === 0) {
      setSummary('')
      
return
    }

    const values = grouped.map(g => g.v)
    const min = Math.min(...values)
    const max = Math.max(...values)
    const last = values[values.length - 1]

    setSummary(`${t('navigation.warehouses.capacityHistory.records')}: ${values.length} · ${t('navigation.warehouses.capacityHistory.min')}: ${min}% · ${t('navigation.warehouses.capacityHistory.max')}: ${max}% · ${t('navigation.warehouses.capacityHistory.current')}: ${last}%`)
  }, [grouped, t])

  const handlePresetChange = (_: React.MouseEvent<HTMLElement>, val: HistoryPreset | null) => {
    if (val) {
      setPreset(val)
      setRangeStart('')
      setRangeEnd('')
    }
  }

  const handleApplyRange = () => {
    if (rangeStart && rangeEnd) {
      setPreset('last4')
    }
  }

  const handleDownloadChart = async () => {
    try {
      const chart = (chartRef.current as any)?.chart

      if (!chart) return
      const uri = await chart.dataURI()
      const a = document.createElement('a')

      a.href = uri
      a.download = `grafica-capacidad-${warehouseName.replace(/\s+/g, '-')}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch {
      // silent fail
    }
  }

  const handleExportCsv = () => {
    if (grouped.length === 0) return
    const rows = grouped.map(g => `${labelOf(g.d, effectiveGroup)},${g.v}`)
    const csv = ['Periodo,PorcentajeOcupado'].concat(rows).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')

    a.href = url
    a.download = `capacidad-${warehouseName.replace(/\s+/g, '-')}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const chartOptions = {
    chart: { type: 'area' as const, height: 260, toolbar: { show: false }, zoom: { enabled: false } },
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth' as const, width: 2 },
    fill: {
      type: 'gradient' as const,
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.35,
        opacityTo: 0.05,
        stops: [0, 90, 100]
      }
    },
    yaxis: {
      min: 0,
      max: 150,
      labels: { formatter: (v: number) => `${v}%` }
    },
    xaxis: {
      type: 'category' as const,
      categories: grouped.map(g => labelOf(g.d, effectiveGroup))
    },
    tooltip: {
      y: { formatter: (v: number) => `${v}%` }
    },
    annotations: {
      yaxis: [{
        y: 100,
        borderColor: '#dc3545',
        borderWidth: 2,
        strokeDashArray: 6,
        label: {
          text: t('navigation.warehouses.capacityHistory.maxCapacityLine'),
          position: 'right' as const,
          fill: { color: 'rgba(220,53,69,.15)' },
          style: { color: '#dc3545', fontWeight: 'bold' as const }
        }
      }]
    }
  }

  const chartSeries = [{
    name: `% Ocupado - ${warehouseName}`,
    data: grouped.map(g => g.v)
  }]

  return (
    <GradientDialog
      open={open}
      onClose={onClose}
      maxWidth='lg'
      fullWidth
      scroll='paper'
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box component='i' className='ri-line-chart-line' />
          {t('navigation.warehouses.capacityHistory.title')} • {warehouseName}
        </Box>
        <IconButton size='small' onClick={onClose} sx={{ color: 'white' }}>
          <Box component='i' className='ri-close-line' />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2, alignItems: 'center' }}>
          <ToggleButtonGroup value={preset} exclusive onChange={handlePresetChange} size='small'>
            <ToggleButton value='last4'>{t('navigation.warehouses.capacityHistory.last4')}</ToggleButton>
            <ToggleButton value='7d'>{t('navigation.warehouses.capacityHistory.last7Days')}</ToggleButton>
            <ToggleButton value='thisMonth'>{t('navigation.warehouses.capacityHistory.thisMonth')}</ToggleButton>
            <ToggleButton value='lastMonth'>{t('navigation.warehouses.capacityHistory.lastMonth')}</ToggleButton>
            <ToggleButton value='90d'>{t('navigation.warehouses.capacityHistory.last90Days')}</ToggleButton>
          </ToggleButtonGroup>

          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
            <TextField
              type='date'
              size='small'
              value={rangeStart}
              onChange={e => setRangeStart(e.target.value)}
              sx={{ width: 150 }}
            />
            <TextField
              type='date'
              size='small'
              value={rangeEnd}
              onChange={e => setRangeEnd(e.target.value)}
              sx={{ width: 150 }}
            />
            <Button size='small' variant='outlined' onClick={handleApplyRange}>
              {t('navigation.warehouses.capacityHistory.apply')}
            </Button>
          </Box>

          <FormControl size='small' sx={{ minWidth: 160 }}>
            <InputLabel id='group-select-label'>
              <Box component='i' className='ri-layer-line' sx={{ mr: 0.5 }} />
              {t('navigation.warehouses.capacityHistory.noGrouping')}
            </InputLabel>
            <Select
              labelId='group-select-label'
              value={group}
              label={t('navigation.warehouses.capacityHistory.noGrouping')}
              onChange={e => setGroup(e.target.value as HistoryGroup)}
            >
              <MenuItem value='raw'>{t('navigation.warehouses.capacityHistory.noGrouping')}</MenuItem>
              <MenuItem value='day'>{t('navigation.warehouses.capacityHistory.groupByDay')}</MenuItem>
              <MenuItem value='week'>{t('navigation.warehouses.capacityHistory.groupByWeek')}</MenuItem>
              <MenuItem value='month'>{t('navigation.warehouses.capacityHistory.groupByMonth')}</MenuItem>
            </Select>
          </FormControl>

          <Box sx={{ display: 'flex', gap: 1, ml: 'auto' }}>
            <Button size='small' variant='contained' onClick={handleDownloadChart} startIcon={<Box component='i' className='ri-image-line' />}>
              {t('navigation.warehouses.capacityHistory.downloadChart')}
            </Button>
            <Button size='small' variant='outlined' onClick={handleExportCsv} startIcon={<Box component='i' className='ri-file-chart-line' />}>
              {t('navigation.warehouses.capacityHistory.exportCsv')}
            </Button>
          </Box>
        </Box>

        <Box sx={{ position: 'relative' }}>
          {isFetching ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 260 }}>
              <CircularProgress />
            </Box>
          ) : grouped.length === 0 ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 260, color: 'text.secondary' }}>
              <Box sx={{ textAlign: 'center' }}>
                <Box component='i' className='ri-folder-open-line' sx={{ fontSize: 48, display: 'block', mb: 1 }} />
                {t('navigation.warehouses.capacityHistory.noData')}
              </Box>
            </Box>
          ) : (
            <AppReactApexCharts
              type='area'
              height={260}
              options={chartOptions}
              series={chartSeries}
              ref={chartRef}
            />
          )}
        </Box>

        {summary && (
          <Typography variant='caption' color='text.secondary' sx={{ mt: 1, display: 'block' }}>
            {summary}
          </Typography>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} variant='outlined'>
          {t('navigation.warehouses.capacityHistory.close')}
        </Button>
      </DialogActions>
    </GradientDialog>
  )
}

export default CapacityHistoryModal
