'use client'

import { useState, useEffect, useCallback, type ReactNode } from 'react'

import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'
import Collapse from '@mui/material/Collapse'
import Divider from '@mui/material/Divider'

export type ApiState = 'idle' | 'loading' | 'success' | 'error'

export type ApiTestConfig<T> = {
  title: string
  subheader?: string
  endpoint: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  initialData?: T | null
  onResponse?: (data: T, status: number) => ReactNode
  autoFetch?: boolean
}

type Props<T> = {
  config: ApiTestConfig<T>
  children: (state: ApiState, data: T | null, error: string | null, refetch: () => void) => ReactNode
}

export default function ApiTestCard<T>({ config, children }: Props<T>) {
  const {
    title,
    subheader,
    endpoint,
    method = 'GET',
    autoFetch = true
  } = config

  const [apiState, setApiState] = useState<ApiState>('idle')
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lastFetch, setLastFetch] = useState<Date | null>(null)
  const [showRaw, setShowRaw] = useState(false)

  const fetch_ = useCallback(async () => {
    setApiState('loading')
    setError(null)

    try {
      const res = await fetch(endpoint, { method })
      const body = await res.json()

      if (!res.ok) {
        setError(`[${res.status}] ${body.message ?? JSON.stringify(body)}`)
        setApiState('error')

        return
      }

      setData(body as T)
      setLastFetch(new Date())
      setApiState('success')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
      setApiState('error')
    }
  }, [endpoint, method])

  useEffect(() => {
    if (autoFetch) fetch_()
  }, [autoFetch, fetch_])

  return (
    <Card>
      <CardHeader
        title={title}
        subheader={subheader}
        action={
          <Box className='flex items-center gap-2'>
            <Button
              variant='outlined'
              size='small'
              onClick={fetch_}
              disabled={apiState === 'loading'}
            >
              <i className='ri-refresh-line' />
              Refresh
            </Button>
            <Button
              variant='text'
              size='small'
              onClick={() => setShowRaw(v => !v)}
            >
              <i className={`${showRaw ? 'ri-eye-close-line' : 'ri-code-view'} ri-sm`} />
              {showRaw ? 'Hide' : 'JSON'}
            </Button>
          </Box>
        }
      />
      <CardContent className='flex flex-col gap-4'>
        <Box className='flex items-center gap-3'>
          <Chip
            label={apiState.toUpperCase()}
            color={
              apiState === 'success' ? 'success'
                : apiState === 'error' ? 'error'
                  : apiState === 'loading' ? 'warning'
                    : 'default'
            }
            size='small'
          />
          <Chip label={method} size='small' variant='outlined' />
          <Typography variant='body2' color='text.secondary' className='font-mono text-xs'>
            {endpoint}
          </Typography>
          {lastFetch && (
            <Typography variant='caption' color='text.disabled'>
              {lastFetch.toLocaleTimeString()}
            </Typography>
          )}
        </Box>

        {apiState === 'loading' && (
          <Box className='flex items-center gap-2'>
            <i className='ri-loader-4-line ri-spin text-lg text-primary' />
            <Typography>Loading...</Typography>
          </Box>
        )}

        {apiState === 'error' && (
          <Box className='flex items-center gap-2'>
            <i className='ri-error-warning-line text-lg text-red-500' />
            <Typography color='error' variant='body2'>{error}</Typography>
          </Box>
        )}

        {children(apiState, data, error, fetch_)}

        <Collapse in={showRaw}>
          <Divider className='mb-2' />
          <Typography variant='caption' color='text.secondary' gutterBottom>
            RAW JSON
          </Typography>
          <Box
            component='pre'
            className='text-xs overflow-auto p-3 rounded bg-neutral-100 dark:bg-neutral-800 border text-neutral-700 dark:text-neutral-300'
          >
            {data ? JSON.stringify(data, null, 2) : 'null'}
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  )
}