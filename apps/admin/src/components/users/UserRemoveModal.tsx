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
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import Alert from '@mui/material/Alert'
import type { PlatformUserRow } from '@/types/apps/platformUserTypes'
import { toast } from 'react-toastify'

interface UserRemoveModalProps {
  open: boolean
  onClose: () => void
  user: PlatformUserRow | null
  onSuccess?: () => void
}

const roleLabel: Record<string, string> = {
  super_admin: 'Super Admin',
  auditor: 'Auditor'
}

const roleColor: Record<string, 'primary' | 'default'> = {
  super_admin: 'primary',
  auditor: 'default'
}

export default function UserRemoveModal({ open, onClose, user, onSuccess }: UserRemoveModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!user) return

    setLoading(true)

    try {
      const res = await fetch(`/api/admin/platform-users/${user.UserID}?action=role`, {
        method: 'DELETE'
      })

      if (!res.ok) {
        const result = await res.json()
        throw new Error(result.message?.[0] || 'Failed to remove role')
      }

      toast.success('Rol de plataforma removido exitosamente')
      handleClose()
      onSuccess?.()
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove role')
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
            <i className='ri-user-unfollow-line' style={{ fontSize: '1.5rem', color: 'error.main' }} />
            Remover Rol de Plataforma
          </Box>
          <IconButton onClick={handleClose} disabled={loading} size='small'>
            <i className='ri-close-line' />
          </IconButton>
        </Box>
      </DialogTitle>

        <Divider sx={{ mb: 3 }} />

        <DialogContent sx={{ p: 1 }}>
        <Box sx={{ mb: 2 }}>
          <Typography variant='body2' color='text.secondary' gutterBottom>
            Se removerá el rol de plataforma de:
          </Typography>
          <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1, mb: 2 }}>
            <Typography fontWeight='bold'>{user.Nombre}</Typography>
            <Typography variant='body2' color='text.secondary'>
              @{user.Usuario} · {user.Email || 'sin email'}
            </Typography>
            <Box sx={{ mt: 1 }}>
              <Chip
                label={roleLabel[user.Role] || user.Role}
                color={roleColor[user.Role] || 'default'}
                size='small'
                variant='outlined'
              />
            </Box>
          </Box>
        </Box>

        <Alert severity='warning'>
          <Typography variant='body2'>
            El usuario perderá inmediatamente el acceso a la plataforma de administración.
          </Typography>
        </Alert>
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
          {loading ? <CircularProgress size={20} color='inherit' /> : 'Remover Rol'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
