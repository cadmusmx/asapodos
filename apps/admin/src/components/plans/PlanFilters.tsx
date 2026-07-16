'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect, useCallback, useRef } from 'react'

import Box from '@mui/material/Box'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import InputAdornment from '@mui/material/InputAdornment'
import CircularProgress from '@mui/material/CircularProgress'

type PlanStatusFilter = 'active' | 'inactive' | ''

const statusOptions: { value: PlanStatusFilter; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'active', label: 'Activos' },
  { value: 'inactive', label: 'Inactivos' }
]

export default function PlanFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mounted, setMounted] = useState(false)

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<PlanStatusFilter>('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [isPending, setIsPending] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setSearch(searchParams.get('search') || '')
    setStatus((searchParams.get('status') as PlanStatusFilter) || '')
    setDebouncedSearch(searchParams.get('search') || '')
    setMounted(true)
  }, [searchParams])

  const applyFilters = useCallback(() => {
    const params = new URLSearchParams()
    if (debouncedSearch) params.set('search', debouncedSearch)
    if (status) params.set('status', status)
    params.set('page', '1')
    setIsPending(true)
    router.push(`/admin/plans?${params.toString()}`)
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

  const hasActiveFilters = Boolean(search || status)

  return (
    <Box sx={{ mb: 3 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          placeholder='Buscar por nombre...'
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
            'aria-label': 'Buscar por nombre del plan'
          }}
        />

        <TextField
          select
          label='Estado'
          value={mounted ? status : ''}
          onChange={e => setStatus(e.target.value as PlanStatusFilter)}
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
