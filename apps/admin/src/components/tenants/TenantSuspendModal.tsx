'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import type { TenantRow } from '@/services/tenant-service'

interface TenantSuspendModalProps {
  open: boolean
  onClose: () => void
  tenant: TenantRow | null
  onSuccess?: () => void
}

export default function TenantSuspendModal({ open, onClose, tenant, onSuccess }: TenantSuspendModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [suspendReason, setSuspendReason] = useState('')

  const handleSubmit = async () => {
    if (!tenant || !suspendReason.trim()) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/admin/tenants/${tenant.TenantID}/suspend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: suspendReason.trim() })
      })

      if (!res.ok) {
        const result = await res.json()
        throw new Error(result.message?.[0] || 'Failed to suspend tenant')
      }

      setSuspendReason('')
      onClose()
      onSuccess?.()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to suspend tenant')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setSuspendReason('')
      setError(null)
      onClose()
    }
  }

  if (!tenant) return null

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth='sm'
      fullWidth
      PaperProps={{ sx: { p: 4 } }}
    >
      <DialogTitle sx={{ p: 0, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <i className='ri-pause-circle-line' style={{ fontSize: '1.5rem', color: 'warning.main' }} />
          Suspender Tenant
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        {error && (
          <Alert severity='error' sx={{ mb: 2 }} role='alert'>
            {error}
          </Alert>
        )}

        <Box sx={{ mb: 2 }}>
          <Typography variant='body2' color='text.secondary' gutterBottom>
            Vas a suspender:
          </Typography>
          <Typography fontWeight='bold'>{tenant.CompanyName}</Typography>
          <Typography variant='caption' color='text.secondary'>{tenant.Dominio}</Typography>
        </Box>

        <Alert severity='warning' sx={{ mb: 2 }}>
          <Typography variant='body2' fontWeight='bold' gutterBottom>Consecuencias:</Typography>
          <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
            <li>Todos los usuarios perderán acceso inmediatamente</li>
            <li>Las sesiones activas se cerrarán</li>
            <li>Los datos no se eliminarán</li>
          </ul>
        </Alert>

        <TextField
          autoFocus
          label='Razón de suspensión'
          fullWidth
          multiline
          rows={3}
          value={suspendReason}
          onChange={e => setSuspendReason(e.target.value)}
          disabled={loading}
          placeholder='Describe la razón de la suspensión...'
        />
      </DialogContent>

      <DialogActions sx={{ mt: 3, p: 0 }}>
        <Button onClick={handleClose} disabled={loading}>
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          color='warning'
          variant='contained'
          disabled={!suspendReason.trim() || loading}
        >
          {loading ? <CircularProgress size={20} color='inherit' /> : 'Suspender'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
