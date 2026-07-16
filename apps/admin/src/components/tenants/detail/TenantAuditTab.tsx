'use client'

import { useState, useEffect } from 'react'

import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import Typography from '@mui/material/Typography'
import type { TransactionLogEntry } from '@gaso/shared'
import TenantAuditTimeline from '@/components/tenants/TenantAuditTimeline'

interface TenantAuditTabProps {
  tenantId: string
}

export default function TenantAuditTab({ tenantId }: TenantAuditTabProps) {
  const [entries, setEntries] = useState<TransactionLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    const fetchAudit = async () => {
      setLoading(true)
      setError(null)

      try {
        const res = await fetch(
          `/api/admin/tenants/${tenantId}/audit?pageSize=50`,
          { signal: controller.signal }
        )

        if (!res.ok) throw new Error('Error loading audit log')

        const data = await res.json()
        setEntries(data.entries ?? [])
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setError(err instanceof Error ? err.message : 'Error loading audit log')
        }
      } finally {
        setLoading(false)
      }
    }

    fetchAudit()

    return () => controller.abort()
  }, [tenantId])

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return <Alert severity='error'>{error}</Alert>
  }

  return (
    <Box>
      <Typography variant='h6' gutterBottom>Historial de Cambios</Typography>
      <TenantAuditTimeline entries={entries} />
    </Box>
  )
}
