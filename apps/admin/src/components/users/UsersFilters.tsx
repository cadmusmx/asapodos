'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect, useCallback, useRef } from 'react'

import Box from '@mui/material/Box'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import InputAdornment from '@mui/material/InputAdornment'
import CircularProgress from '@mui/material/CircularProgress'
import type { PlatformRole } from '@/types/apps/platformUserTypes'

const roleOptions: { value: PlatformRole | ''; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'auditor', label: 'Auditor' }
]

export default function UsersFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mounted, setMounted] = useState(false)

  const [search, setSearch] = useState('')
  const [role, setRole] = useState<PlatformRole | ''>('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [isPending, setIsPending] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setSearch(searchParams.get('search') || '')
    setRole((searchParams.get('role') as PlatformRole) || '')
    setDebouncedSearch(searchParams.get('search') || '')
    setMounted(true)
  }, [searchParams])

  const applyFilters = useCallback(() => {
    const params = new URLSearchParams()
    if (debouncedSearch) params.set('search', debouncedSearch)
    if (role) params.set('role', role)
    params.set('page', '1')
    setIsPending(true)
    router.push(`/admin/users?${params.toString()}`)
    setTimeout(() => setIsPending(false), 500)
  }, [debouncedSearch, role, router])

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
  }, [debouncedSearch, role, mounted])

  const handleClear = useCallback(() => {
    setSearch('')
    setRole('')
    setDebouncedSearch('')
    router.push('/admin/users')
  }, [router])

  const hasActiveFilters = Boolean(search || role)

  return (
    <Box sx={{ mb: 3 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          placeholder='Buscar por nombre o usuario...'
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
            'aria-label': 'Buscar por nombre o usuario'
          }}
        />

        <TextField
          select
          label='Rol'
          value={mounted ? role : ''}
          onChange={e => setRole(e.target.value as PlatformRole | '')}
          size='small'
          sx={{ minWidth: 160 }}
          slotProps={{
            select: {
              'aria-label': 'Filtrar por rol'
            }
          }}
        >
          {roleOptions.map(option => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
      </Stack>
    </Box>
  )
}
