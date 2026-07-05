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
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import type { TenantRow } from '@/services/tenant-service'

interface TenantDeactivateModalProps {
  open: boolean
  onClose: () => void
  tenant: TenantRow | null
  onSuccess?: () => void
}

export default function TenantDeactivateModal({ open, onClose, tenant, onSuccess }: TenantDeactivateModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!tenant) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/admin/tenants/${tenant.TenantID}/deactivate`, {
        method: 'POST'
      })

      if (!res.ok) {
        const result = await res.json()
        throw new Error(result.message?.[0] || 'Failed to deactivate tenant')
      }

      onClose()
      onSuccess?.()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deactivate tenant')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
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
          <i className='ri-error-warning-line' style={{ fontSize: '1.5rem', color: 'error.main' }} />
          Desactivar Tenant
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 1 }}>
        {error && (
          <Alert severity='error' sx={{ mb: 2 }} role='alert'>
            {error}
          </Alert>
        )}

        <Typography variant='body2' color='text.secondary' gutterBottom>
          Vas a desactivar:
        </Typography>
        <Typography fontWeight='bold'>{tenant.CompanyName}</Typography>
        <Typography variant='caption' color='text.secondary'>{tenant.Dominio}</Typography>

        <Alert severity='error' sx={{ mt: 2 }}>
          <Typography variant='body2' fontWeight='bold' gutterBottom>Consecuencias:</Typography>
          <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
            <li>El tenant será marcado como inactivo</li>
            <li>No se eliminan datos</li>
            <li>Puede reactivarse en el futuro</li>
          </ul>
        </Alert>
      </DialogContent>

      <DialogActions sx={{ mt: 3, p: 0 }}>
        <Button onClick={handleClose} disabled={loading}>
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          color='error'
          variant='contained'
          disabled={loading}
        >
          {loading ? <CircularProgress size={20} color='inherit' /> : 'Desactivar'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
