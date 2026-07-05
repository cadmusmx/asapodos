'use client'

import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import { useState } from 'react'
import { useSearchParams } from 'next/navigation'

export default function AuditExportButton() {
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)

  const handleExport = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      for (const [key, value] of searchParams.entries()) {
        if (['tenantId', 'tableName', 'action', 'appUser', 'startDate', 'endDate'].includes(key)) {
          params.set(key, value)
        }
      }
      const res = await fetch(`/api/admin/audit/export?${params.toString()}`)
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = res.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] || 'audit-log.csv'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error('Export failed:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant='outlined'
      size='small'
      onClick={handleExport}
      disabled={loading}
      startIcon={loading ? <CircularProgress size={16} /> : <i className='ri-download-line' />}
    >
      {loading ? 'Exportando...' : 'Exportar CSV'}
    </Button>
  )
}
