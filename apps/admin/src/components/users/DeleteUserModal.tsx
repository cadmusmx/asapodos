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
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import Alert from '@mui/material/Alert'
import type { PlatformUserRow } from '@/types/apps/platformUserTypes'
import { toast } from 'react-toastify'
import { FormControlLabel, Radio, RadioGroup } from '@mui/material'

interface DeleteUserModalProps {
  open: boolean
  onClose: () => void
  user: PlatformUserRow | null
  onSuccess?: () => void
}

export default function DeleteUserModal({ open, onClose, user, onSuccess }: DeleteUserModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'account' | 'full'>('account')
  const [depError, setDepError] = useState(false)

  const handleSubmit = async () => {
    if (!user) return

    setLoading(true)
    setDepError(false)

    try {
      const res = await fetch(`/api/admin/platform-users/${user.UserID}?mode=${mode}`, {
        method: 'DELETE'
      })

      if (!res.ok) {
        const result = await res.json()
        // 409 = el empleado tiene historial → sugerir modo 'account'
        if (res.status === 409) {
          setDepError(true)
          throw new Error(result.message?.[0] || 'El empleado tiene registros asociados.')
        }
        throw new Error(result.message?.[0] || 'Failed to delete user')
      }

      toast.success(mode === 'full' ? 'Usuario y empleado eliminados' : 'Cuenta eliminada')
      handleClose()
      onSuccess?.()
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete user')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      onClose()
    }
  }

  if (!user) return null

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth='sm'
      fullWidth
      PaperProps={{ sx: { p: 4 } }}
    >
      <DialogTitle sx={{ p: 0, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <i className='ri-delete-bin-line' style={{ fontSize: '1.5rem', color: 'error.main' }} />
            Eliminar Usuario
          </Box>
          <IconButton onClick={handleClose} disabled={loading} size='small'>
            <i className='ri-close-line' />
          </IconButton>
        </Box>
      </DialogTitle>

      <Divider sx={{ mb: 3 }} />

      <DialogContent sx={{ p: 1 }}>
        <RadioGroup value={mode} onChange={(e) => setMode(e.target.value as 'account' | 'full')} sx={{ mb: 2 }}>
          <FormControlLabel value='account' control={<Radio />}
            label='Solo la cuenta — el empleado se conserva en RH, pierde el acceso' />
          <FormControlLabel value='full' control={<Radio />}
            label='Cuenta y empleado — elimina la persona del sistema por completo' />
        </RadioGroup>

        <Alert severity={mode === 'full' ? 'error' : 'warning'}>
          <Typography variant='body2'>
            {mode === 'full'
              ? 'Se eliminarán la cuenta y el registro de empleado. Irreversible.'
              : 'Se eliminará la cuenta de acceso. El empleado permanece en RH.'}
          </Typography>
        </Alert>

        {depError && (
          <Alert severity='info' sx={{ mt: 2 }}>
            <Typography variant='body2'>
              Este empleado tiene registros asociados y no puede eliminarse por completo.
              Usa <strong>Solo la cuenta</strong>, o reasigna su historial primero.
            </Typography>
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ mt: 4, p: 0 }}>
        <Button onClick={handleClose} disabled={loading}>
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          color='error'
          variant='contained'
          disabled={loading}
        >
          {loading ? <CircularProgress size={20} color='inherit' /> : 'Eliminar'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
