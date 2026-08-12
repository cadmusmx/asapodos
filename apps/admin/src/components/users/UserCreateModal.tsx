'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Box from '@mui/material/Box'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import type { PlatformRole } from '@/types/apps/platformUserTypes'
import { toast } from 'react-toastify'

interface UserCreateModalProps {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
}

const roleOptions: { value: PlatformRole; label: string; description: string }[] = [
  { value: 'super_admin', label: 'Super Admin', description: 'Acceso completo a la plataforma' },
  { value: 'auditor', label: 'Auditor', description: 'Solo lectura de logs de auditoría' }
]

interface CreateFormState {
  nombre: string
  apellidos: string
  usuario: string
  email: string
  password: string
  confirmPassword: string
  role: PlatformRole
}

const initialCreateForm: CreateFormState = {
  nombre: '',
  apellidos: '',
  usuario: '',
  email: '',
  password: '',
  confirmPassword: '',
  role: 'auditor'
}

export default function UserCreateModal({ open, onClose, onSuccess }: UserCreateModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const [createForm, setCreateForm] = useState<CreateFormState>(initialCreateForm)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof CreateFormState, string>>>({})

  const handleCreateChange = (field: keyof CreateFormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setCreateForm(prev => ({ ...prev, [field]: e.target.value }))
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const validateCreate = (): boolean => {
    const errors: Partial<Record<keyof CreateFormState, string>> = {}

    if (!createForm.nombre.trim()) {
      errors.nombre = 'El nombre es requerido'
    }

    if (!createForm.apellidos.trim()) {
      errors.apellidos = 'Los apellidos son requeridos'
    }

    if (!createForm.usuario.trim()) {
      errors.usuario = 'El nombre de usuario es requerido'
    } else if (createForm.usuario.length < 3) {
      errors.usuario = 'Mínimo 3 caracteres'
    }

    if (!createForm.email.trim()) {
      errors.email = 'El email es requerido'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(createForm.email)) {
      errors.email = 'Email inválido'
    }

    if (!createForm.password) {
      errors.password = 'La contraseña es requerida'
    } else if (createForm.password.length < 4) {
      errors.password = 'Mínimo 4 caracteres'
    }

    if (createForm.password !== createForm.confirmPassword) {
      errors.confirmPassword = 'Las contraseñas no coinciden'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleCreateSubmit = async () => {
    if (!validateCreate()) return

    setLoading(true)

    try {
      const res = await fetch('/api/admin/platform-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: createForm.nombre.trim(),
          apellidos: createForm.apellidos.trim(),
          usuario: createForm.usuario.trim(),
          email: createForm.email.trim(),
          password: createForm.password,
          role: createForm.role
        })
      })

      if (!res.ok) {
        const result = await res.json()
        throw new Error(result.message?.[0] || 'Failed to create user')
      }

      toast.success('Usuario creado exitosamente')
      handleClose()
      onSuccess?.()
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create user')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setCreateForm(initialCreateForm)
      setFieldErrors({})
      onClose()
    }
  }

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
            <i className='ri-user-add-line' style={{ fontSize: '1.5rem', color: 'primary.main' }} />
            Crear Usuario de Plataforma
          </Box>
          <IconButton onClick={handleClose} disabled={loading} size='small'>
            <i className='ri-close-line' />
          </IconButton>
        </Box>
      </DialogTitle>

      <Divider sx={{ mb: 2 }} />

      <DialogContent sx={{ p: 1 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <TextField
            label='Nombre(s)'
            placeholder='Juan'
            value={createForm.nombre}
            onChange={handleCreateChange('nombre')}
            required fullWidth
            error={Boolean(fieldErrors.nombre)}
            helperText={fieldErrors.nombre}
            disabled={loading}
            slotProps={{ htmlInput: { maxLength: 100 } }}
          />

          <TextField
            label='Apellidos'
            placeholder='Pérez García'
            value={createForm.apellidos}
            onChange={handleCreateChange('apellidos')}
            required fullWidth
            error={Boolean(fieldErrors.apellidos)}
            helperText={fieldErrors.apellidos}
            disabled={loading}
            slotProps={{ htmlInput: { maxLength: 100 } }}
          />

          <TextField
            label='Nombre de Usuario'
            placeholder='jperez'
            value={createForm.usuario}
            onChange={handleCreateChange('usuario')}
            required
            fullWidth
            error={Boolean(fieldErrors.usuario)}
            helperText={fieldErrors.usuario || 'Mínimo 3 caracteres'}
            disabled={loading}
            slotProps={{ htmlInput: { maxLength: 125 } }}
          />

          <TextField
            label='Email'
            type='email'
            placeholder='jperez@empresa.com'
            value={createForm.email}
            onChange={handleCreateChange('email')}
            required
            fullWidth
            error={Boolean(fieldErrors.email)}
            helperText={fieldErrors.email}
            disabled={loading}
            slotProps={{ htmlInput: { maxLength: 255 } }}
          />

          <TextField
            label='Contraseña'
            type='password'
            placeholder='Mínimo 4 caracteres'
            value={createForm.password}
            onChange={handleCreateChange('password')}
            required
            fullWidth
            error={Boolean(fieldErrors.password)}
            helperText={fieldErrors.password}
            disabled={loading}
          />

          <TextField
            label='Confirmar Contraseña'
            type='password'
            placeholder='Repite la contraseña'
            value={createForm.confirmPassword}
            onChange={handleCreateChange('confirmPassword')}
            required
            fullWidth
            error={Boolean(fieldErrors.confirmPassword)}
            helperText={fieldErrors.confirmPassword}
            disabled={loading}
          />

          <TextField
            select
            label='Rol de Plataforma'
            value={createForm.role}
            onChange={handleCreateChange('role')}
            fullWidth
            disabled={loading}
          >
            {roleOptions.map(option => (
              <MenuItem key={option.value} value={option.value}>
                <Box>
                  <Typography variant='body2' fontWeight='bold'>{option.label}</Typography>
                  <Typography variant='caption' color='text.secondary'>{option.description}</Typography>
                </Box>
              </MenuItem>
            ))}
          </TextField>
        </Box>
      </DialogContent>

      <DialogActions sx={{ mt: 4, p: 0 }}>
        <Button variant='outlined' onClick={handleClose} disabled={loading}>
          Cancelar
        </Button>
        <Button variant='contained' disabled={loading} onClick={handleCreateSubmit}>
          {loading ? <CircularProgress size={20} color='inherit' /> : 'Crear Usuario'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
