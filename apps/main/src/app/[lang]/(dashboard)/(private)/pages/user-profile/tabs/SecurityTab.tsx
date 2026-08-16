'use client'

import { useCallback, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

type PasswordFormState = {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

type Props = {
  onPasswordChanged: (message: string) => void
  onPasswordError: (message: string) => void
}

const SecurityTab = ({ onPasswordChanged, onPasswordError }: Props) => {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState<PasswordFormState>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [showPassword, setShowPassword] = useState({ current: false, new: false, confirm: false })

  const togglePassword = useCallback((field: 'current' | 'new' | 'confirm') => {
    setShowPassword(s => ({ ...s, [field]: !s[field] }))
  }, [])

  const validate = (): boolean => {
    const errors: Record<string, string> = {}

    if (!form.currentPassword) {
      errors.currentPassword = 'La contraseña actual es requerida'
    }

    if (!form.newPassword) {
      errors.newPassword = 'La nueva contraseña es requerida'
    } else if (form.newPassword.length < 8) {
      errors.newPassword = 'La nueva contraseña debe tener al menos 8 caracteres'
    }

    if (!form.confirmPassword) {
      errors.confirmPassword = 'La confirmación es requerida'
    } else if (form.newPassword !== form.confirmPassword) {
      errors.confirmPassword = 'La nueva contraseña y su confirmación no coinciden'
    }

    setFieldErrors(errors)

    return Object.keys(errors).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return

    setSaving(true)

    try {
      const res = await fetch('/api/profile/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(data?.message ?? 'Error al cambiar la contraseña')
      }

      onPasswordChanged('Contraseña actualizada correctamente')
      setDialogOpen(false)
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setFieldErrors({})
    } catch (e) {
      onPasswordError(e instanceof Error ? e.message : 'Error al cambiar la contraseña')
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    if (saving) return

    setDialogOpen(false)
    setForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    setFieldErrors({})
    setShowPassword({ current: false, new: false, confirm: false })
  }

  return (
    <>
      <Stack spacing={3}>
        <Card>
          <CardHeader
            title='Seguridad de la cuenta'
            subheader='Gestiona la seguridad de tu cuenta'
            titleTypographyProps={{ variant: 'h6' }}
          />
          <CardContent>
            <Stack spacing={2}>
              <Alert severity='info'>
                Tu contraseña debe tener al menos 8 caracteres. Se recomienda usar una combinación de letras, números y símbolos.
              </Alert>

              <Box>
                <Typography variant='body2' mb={2}>
                  ¿Deseas cambiar tu contraseña de acceso? Haz clic en el botón siguiente.
                </Typography>
                <Button
                  variant='contained'
                  startIcon={<i className='ri-lock-password-line' />}
                  onClick={() => setDialogOpen(true)}
                >
                  Cambiar contraseña
                </Button>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Stack>

      <Dialog open={dialogOpen} onClose={handleClose} maxWidth='sm' fullWidth>
        <DialogTitle variant='h6'>Cambiar contraseña</DialogTitle>

        <DialogContent>
          <Stack spacing={3} sx={{ pt: 1 }}>
            <TextField
              label='Contraseña actual'
              type={showPassword.current ? 'text' : 'password'}
              value={form.currentPassword}
              onChange={e => setForm(f => ({ ...f, currentPassword: e.target.value }))}
              onBlur={() => {
                if (fieldErrors.currentPassword) validate()
              }}
              error={Boolean(fieldErrors.currentPassword)}
              helperText={fieldErrors.currentPassword}
              fullWidth
              size='small'
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position='end'>
                      <IconButton
                        edge='end'
                        aria-label={showPassword.current ? 'Ocultar contraseña actual' : 'Mostrar contraseña actual'}
                        onClick={() => togglePassword('current')}
                      >
                        <i className={showPassword.current ? 'ri-eye-off-line' : 'ri-eye-line'} />
                      </IconButton>
                    </InputAdornment>
                  )
                }
              }}
            />

            <TextField
              label='Nueva contraseña'
              type={showPassword.new ? 'text' : 'password'}
              value={form.newPassword}
              onChange={e => setForm(f => ({ ...f, newPassword: e.target.value }))}
              onBlur={() => {
                if (fieldErrors.newPassword) validate()
              }}
              error={Boolean(fieldErrors.newPassword)}
              helperText={fieldErrors.newPassword || 'Mínimo 8 caracteres'}
              fullWidth
              size='small'
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position='end'>
                      <IconButton
                        edge='end'
                        aria-label={showPassword.new ? 'Ocultar nueva contraseña' : 'Mostrar nueva contraseña'}
                        onClick={() => togglePassword('new')}
                      >
                        <i className={showPassword.new ? 'ri-eye-off-line' : 'ri-eye-line'} />
                      </IconButton>
                    </InputAdornment>
                  )
                }
              }}
            />

            <TextField
              label='Confirmar nueva contraseña'
              type={showPassword.confirm ? 'text' : 'password'}
              value={form.confirmPassword}
              onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
              onBlur={() => {
                if (fieldErrors.confirmPassword) validate()
              }}
              error={Boolean(fieldErrors.confirmPassword)}
              helperText={fieldErrors.confirmPassword}
              fullWidth
              size='small'
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position='end'>
                      <IconButton
                        edge='end'
                        aria-label={showPassword.confirm ? 'Ocultar confirmación' : 'Mostrar confirmación'}
                        onClick={() => togglePassword('confirm')}
                      >
                        <i className={showPassword.confirm ? 'ri-eye-off-line' : 'ri-eye-line'} />
                      </IconButton>
                    </InputAdornment>
                  )
                }
              }}
            />
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={handleClose} disabled={saving}>
            Cancelar
          </Button>
          <Button
            variant='contained'
            onClick={handleSubmit}
            disabled={
              saving ||
              !form.currentPassword ||
              !form.newPassword ||
              !form.confirmPassword
            }
            startIcon={saving ? <CircularProgress size={16} color='inherit' /> : null}
          >
            {saving ? 'Guardando...' : 'Cambiar contraseña'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default SecurityTab
