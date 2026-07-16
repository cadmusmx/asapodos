'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Box from '@mui/material/Box'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import type { PlatformUserRow } from '@/types/apps/platformUserTypes'
import { toast } from 'react-toastify'

interface EditUserModalProps {
  open: boolean
  onClose: () => void
  user: PlatformUserRow | null
  onSuccess?: () => void
}

export default function EditUserModal({ open, onClose, user, onSuccess }: EditUserModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    nombre: '',
    email: ''
  })
  const [fieldErrors, setFieldErrors] = useState<{ nombre?: string; email?: string }>({})

  useEffect(() => {
    if (user) {
      setForm({ nombre: user.Nombre || '', email: user.Email || '' })
    }
  }, [user])

  const handleChange = (field: 'nombre' | 'email') => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }))
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const validate = (): boolean => {
    const errors: { nombre?: string; email?: string } = {}

    if (!form.nombre.trim()) {
      errors.nombre = 'El nombre es requerido'
    }

    if (!form.email.trim()) {
      errors.email = 'El email es requerido'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errors.email = 'Email inválido'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async () => {
    if (!validate() || !user) return

    setLoading(true)

    try {
      const res = await fetch(`/api/admin/platform-users/${user.UserID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: form.nombre.trim(),
          email: form.email.trim()
        })
      })

      if (!res.ok) {
        const result = await res.json()
        throw new Error(result.message?.[0] || 'Failed to update user')
      }

      toast.success('Usuario actualizado exitosamente')
      handleClose()
      onSuccess?.()
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update user')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setForm({ nombre: '', email: '' })
      setFieldErrors({})
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
      <Box component='form' onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
        <DialogTitle sx={{ p: 0, mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <i className='ri-edit-line' style={{ fontSize: '1.5rem', color: 'primary.main' }} />
              Editar Usuario
            </Box>
            <IconButton onClick={handleClose} disabled={loading} size='small'>
              <i className='ri-close-line' />
            </IconButton>
          </Box>
        </DialogTitle>

        <Divider sx={{ mb: 3 }} />

        <DialogContent sx={{ p: 1 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1, mb: 1 }}>
              <Typography variant='caption' color='text.secondary'>
                Usuario: @{user.Usuario}
              </Typography>
              <Typography variant='body2' fontWeight='bold'>
                ID: {user.UserID}
              </Typography>
            </Box>

            <TextField
              label='Nombre Completo'
              placeholder='Juan Pérez García'
              value={form.nombre}
              onChange={handleChange('nombre')}
              required
              fullWidth
              error={Boolean(fieldErrors.nombre)}
              helperText={fieldErrors.nombre}
              disabled={loading}
              inputProps={{ maxLength: 255 }}
            />

            <TextField
              label='Email'
              type='email'
              placeholder='jperez@empresa.com'
              value={form.email}
              onChange={handleChange('email')}
              required
              fullWidth
              error={Boolean(fieldErrors.email)}
              helperText={fieldErrors.email}
              disabled={loading}
              inputProps={{ maxLength: 255 }}
            />
          </Box>
        </DialogContent>

        <DialogActions sx={{ mt: 4, p: 0 }}>
          <Button variant='outlined' onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            type='submit'
            variant='contained'
            disabled={loading}
          >
            {loading ? <CircularProgress size={20} color='inherit' /> : 'Guardar Cambios'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}
