'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect, useCallback, useRef } from 'react'

import Box from '@mui/material/Box'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import InputAdornment from '@mui/material/InputAdornment'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import type { TenantStatus } from '@/services/tenant-service'

const statusOptions: { value: TenantStatus | ''; label: string; color: 'success' | 'warning' | 'error' | 'info' | 'default' }[] = [
  { value: '', label: 'Todos', color: 'default' },
  { value: 'ACTIVE', label: 'Activos', color: 'success' },
  { value: 'SUSPENDED', label: 'Suspendidos', color: 'warning' },
  { value: 'INACTIVE', label: 'Inactivos', color: 'error' },
  { value: 'TRIAL', label: 'Trial', color: 'info' }
]

export default function TenantFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mounted, setMounted] = useState(false)

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<TenantStatus | ''>('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [isPending, setIsPending] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setSearch(searchParams.get('search') || '')
    setStatus((searchParams.get('status') as TenantStatus) || '')
    setDebouncedSearch(searchParams.get('search') || '')
    setMounted(true)
  }, [searchParams])

  const applyFilters = useCallback(() => {
    const params = new URLSearchParams()
    if (debouncedSearch) params.set('search', debouncedSearch)
    if (status) params.set('status', status)
    params.set('page', '1')
    setIsPending(true)
    router.push(`/admin/tenants?${params.toString()}`)
    setTimeout(() => setIsPending(false), 500)
  }, [debouncedSearch, status, router])

  useEffect(() => {
    if (!mounted) return
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      setDebouncedSearch(search)
    }, 400)
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [search, mounted])

  useEffect(() => {
    if (!mounted) return
    applyFilters()
  }, [debouncedSearch, status, mounted])

  const handleClear = useCallback(() => {
    setSearch('')
    setStatus('')
    setDebouncedSearch('')
    router.push('/admin/tenants')
  }, [router])

  const hasActiveFilters = Boolean(search || status)

  return (
    <Box sx={{ mb: 3 }}>
      {/* <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap sx={{ mb: 2 }}>
        {statusOptions.map(option => (
          <Chip
            key={option.value}
            label={option.label}
            variant={mounted && status === option.value ? 'filled' : 'outlined'}
            color={mounted && status === option.value ? option.color : 'default'}
            onClick={() => setStatus(option.value)}
            size='small'
            sx={{ cursor: 'pointer' }}
          />
        ))}
        {hasActiveFilters && (
          <Chip
            label='Limpiar'
            variant='outlined'
            onClick={handleClear}
            size='small'
            deleteIcon={<i className='ri-close-line' style={{ fontSize: '0.875rem' }} />}
            onDelete={handleClear}
            sx={{ cursor: 'pointer' }}
          />
        )}
      </Stack> */}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          placeholder='Buscar por nombre o dominio...'
          value={mounted ? search : ''}
          onChange={e => setSearch(e.target.value)}
          size='small'
          sx={{ minWidth: 280, flex: 1 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position='start'>
                  {isPending ? <CircularProgress size={16} /> : <i className='ri-search-line' />}
                </InputAdornment>
              )
            }
          }}
          inputProps={{
            'aria-label': 'Buscar por nombre o dominio'
          }}
        />

        <TextField
          select
          label='Estado'
          value={mounted ? status : ''}
          onChange={e => setStatus(e.target.value as TenantStatus | '')}
          size='small'
          sx={{ minWidth: 160 }}
          slotProps={{
            select: {
              'aria-label': 'Filtrar por estado'
            }
          }}
        >
          {statusOptions.map(option => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
      </Stack>
    </Box>
  )
}
