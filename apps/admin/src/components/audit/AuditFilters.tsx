'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useCallback, useEffect, useRef } from 'react'

import Box from '@mui/material/Box'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import InputAdornment from '@mui/material/InputAdornment'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Autocomplete from '@mui/material/Autocomplete'
import CircularProgress from '@mui/material/CircularProgress'
import type { TenantRow } from '@/services/tenant-service'

const actionOptions = [
  { value: '', label: 'Todas las acciones' },
  { value: 'TEN_CR', label: 'Tenant Creado' },
  { value: 'TEN_UP', label: 'Tenant Actualizado' },
  { value: 'TEN_ACT', label: 'Tenant Activado' },
  { value: 'TEN_SUSP', label: 'Tenant Suspendido' },
  { value: 'TEN_DEA', label: 'Tenant Desactivado' }
]

type DatePreset = 'today' | '7days' | '30days' | 'thisMonth' | null

function getDateRange(preset: DatePreset): { start: string; end: string } | null {
  const now = new Date()
  const today = now.toISOString().split('T')[0]

  switch (preset) {
    case 'today':
      return { start: today, end: today }
    case '7days': {
      const d = new Date(now)
      d.setDate(d.getDate() - 7)
      return { start: d.toISOString().split('T')[0], end: today }
    }
    case '30days': {
      const d = new Date(now)
      d.setDate(d.getDate() - 30)
      return { start: d.toISOString().split('T')[0], end: today }
    }
    case 'thisMonth': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
      return { start, end: today }
    }
    default:
      return null
  }
}

export default function AuditFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mounted, setMounted] = useState(false)

  const [tableName, setTableName] = useState('')
  const [action, setAction] = useState('')
  const [appUser, setAppUser] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [activePreset, setActivePreset] = useState<DatePreset>(null)
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [tenantInput, setTenantInput] = useState('')
  const [tenantOptions, setTenantOptions] = useState<TenantRow[]>([])
  const [tenantLoading, setTenantLoading] = useState(false)

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const tenantFetchRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setTableName(searchParams.get('tableName') || '')
    setAction(searchParams.get('action') || '')
    setAppUser(searchParams.get('appUser') || '')
    setStartDate(searchParams.get('startDate') || '')
    setEndDate(searchParams.get('endDate') || '')
    setTenantId(searchParams.get('tenantId') || null)
    setMounted(true)
  }, [searchParams])

  const applyFilters = useCallback((overrides?: { start?: string; end?: string }) => {
    const params = new URLSearchParams()
    if (tenantId) params.set('tenantId', tenantId)
    if (tableName) params.set('tableName', tableName)
    if (action) params.set('action', action)
    if (appUser) params.set('appUser', appUser)
    const s = overrides?.start ?? startDate
    const e = overrides?.end ?? endDate
    if (s) params.set('startDate', s)
    if (e) params.set('endDate', e)
    params.set('page', '1')
    router.push(`/admin/audit?${params.toString()}`)
  }, [tenantId, tableName, action, appUser, startDate, endDate, router])

  useEffect(() => {
    if (!mounted) return
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      applyFilters()
    }, 500)
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [tenantId, tableName, action, appUser, startDate, endDate, mounted])

  const handlePreset = useCallback((preset: DatePreset) => {
    setActivePreset(preset)
    if (preset === null) {
      setStartDate('')
      setEndDate('')
      applyFilters({ start: '', end: '' })
    } else {
      const range = getDateRange(preset)
      if (range) {
        setStartDate(range.start)
        setEndDate(range.end)
        applyFilters({ start: range.start, end: range.end })
      }
    }
  }, [applyFilters])

  const handleClear = useCallback(() => {
    setTableName('')
    setAction('')
    setAppUser('')
    setStartDate('')
    setEndDate('')
    setActivePreset(null)
    setTenantId(null)
    setTenantOptions([])
    router.push('/admin/audit')
  }, [router])

  const fetchTenants = useCallback(async (search: string) => {
    setTenantLoading(true)
    try {
      const res = await fetch(`/api/admin/tenants?page=1&pageSize=50${search ? `&search=${encodeURIComponent(search)}` : ''}`)
      if (res.ok) {
        const data = await res.json()
        setTenantOptions(data.tenants || [])
      }
    } catch {
      setTenantOptions([])
    } finally {
      setTenantLoading(false)
    }
  }, [])

  useEffect(() => {
    if (tenantFetchRef.current) clearTimeout(tenantFetchRef.current)
    tenantFetchRef.current = setTimeout(() => {
      fetchTenants(tenantInput)
    }, 300)
    return () => {
      if (tenantFetchRef.current) clearTimeout(tenantFetchRef.current)
    }
  }, [tenantInput, fetchTenants])

  const hasActiveFilters = Boolean(tenantId || tableName || action || appUser || startDate || endDate)

  return (
    <Box sx={{ mb: 3 }}>
      <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap sx={{ mb: 2 }}>
        {(['today', '7days', '30days', 'thisMonth'] as const).map(preset => {
          const labels: Record<string, string> = {
            today: 'Hoy',
            '7days': 'Últimos 7 días',
            '30days': 'Últimos 30 días',
            thisMonth: 'Este mes'
          }
          return (
            <Chip
              key={preset}
              label={labels[preset]}
              variant={mounted && activePreset === preset ? 'filled' : 'outlined'}
              color={mounted && activePreset === preset ? 'primary' : 'default'}
              onClick={() => handlePreset(preset)}
              size='small'
              sx={{ cursor: 'pointer' }}
            />
          )
        })}
        {hasActiveFilters && (
          <Chip
            label='Limpiar'
            variant='outlined'
            onClick={handleClear}
            size='small'
            onDelete={handleClear}
            deleteIcon={<i className='ri-close-line' style={{ fontSize: '0.875rem' }} />}
            sx={{ cursor: 'pointer' }}
          />
        )}
      </Stack>

      <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems='flex-end'>
          <Autocomplete
            options={tenantOptions}
            loading={tenantLoading}
            getOptionLabel={(option) => option.CompanyName}
            value={tenantOptions.find(t => t.TenantID === tenantId) || null}
            onChange={(_, value) => setTenantId(value?.TenantID || null)}
            onInputChange={(_, value) => setTenantInput(value)}
            renderInput={(params) => (
              <TextField
                {...params}
                label='Tenant'
                size='small'
                sx={{ minWidth: 200 }}
                slotProps={{
                  input: {
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {tenantLoading ? <CircularProgress size={16} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    )
                  }
                }}
              />
            )}
          />

          <TextField
            label='Tabla'
            value={mounted ? tableName : ''}
            onChange={e => setTableName(e.target.value)}
            size='small'
            sx={{ minWidth: 180 }}
            placeholder='Security.Tenants'
            inputProps={{ 'aria-label': 'Nombre de la tabla' }}
          />

          <TextField
            select
            label='Acción'
            value={mounted ? action : ''}
            onChange={e => setAction(e.target.value)}
            size='small'
            sx={{ minWidth: 180 }}
            inputProps={{ 'aria-label': 'Tipo de acción' }}
          >
            {actionOptions.map(option => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label='Usuario App'
            value={mounted ? appUser : ''}
            onChange={e => setAppUser(e.target.value)}
            size='small'
            sx={{ minWidth: 150 }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position='start'>@</InputAdornment>
                ),
                'aria-label': 'Filtrar por usuario de app'
              }
            }}
          />

          <TextField
            label='Desde'
            type='date'
            value={mounted ? startDate : ''}
            onChange={e => {
              setActivePreset(null)
              setStartDate(e.target.value)
            }}
            size='small'
            sx={{ minWidth: 150 }}
            slotProps={{
              inputLabel: { shrink: true },
              input: { 'aria-label': 'Fecha inicial' }
            }}
          />

          <TextField
            label='Hasta'
            type='date'
            value={mounted ? endDate : ''}
            onChange={e => {
              setActivePreset(null)
              setEndDate(e.target.value)
            }}
            size='small'
            sx={{ minWidth: 150 }}
            slotProps={{
              inputLabel: { shrink: true },
              input: { 'aria-label': 'Fecha final' }
            }}
          />
        </Stack>
      </Box>
    </Box>
  )
}
