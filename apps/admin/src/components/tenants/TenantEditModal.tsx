'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import IconButton from '@mui/material/IconButton'
import Box from '@mui/material/Box'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import type { TenantRow } from '@/services/tenant-service'

const subscriptionPlans = [
  { value: '', label: 'Sin plan' },
  { value: 'basic', label: 'Basic' },
  { value: 'pro', label: 'Pro' },
  { value: 'enterprise', label: 'Enterprise' }
]

// const DOMAIN_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$/
const DOMAIN_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9-]*/

function validateDomain(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed) return false
  // const parts = trimmed.split('.')
  // if (parts.length < 2) return false
  return DOMAIN_REGEX.test(trimmed)
}

interface TenantEditModalProps {
  open: boolean
  onClose: () => void
  tenant: TenantRow | null
  onSuccess?: () => void
}

export default function TenantEditModal({ open, onClose, tenant, onSuccess }: TenantEditModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dominioError, setDominioError] = useState<string | null>(null)
  const [form, setForm] = useState({
    companyName: '',
    dominio: '',
    subscriptionPlan: '',
    maxUsers: '',
    region: ''
  })

  useEffect(() => {
    if (tenant) {
      setForm({
        companyName: tenant.CompanyName,
        dominio: tenant.Dominio,
        subscriptionPlan: tenant.SubscriptionPlan || '',
        maxUsers: tenant.MaxUsers?.toString() || '',
        region: tenant.Region || ''
      })
    }
  }, [tenant])

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }))
    if (field === 'dominio' && dominioError) setDominioError(null)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!tenant) return

    setLoading(true)
    setError(null)
    setDominioError(null)

    const dominio = form.dominio.trim()
    if (!validateDomain(dominio)) {
      setDominioError('Ingresa un dominio válido (ej. empresa.com)')
      setLoading(false)
      return
    }

    const data = {
      companyName: form.companyName,
      dominio,
      subscriptionPlan: form.subscriptionPlan || undefined,
      maxUsers: form.maxUsers ? Number(form.maxUsers) : undefined,
      region: form.region || undefined
    }

    try {
      const res = await fetch(`/api/admin/tenants/${tenant.TenantID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      if (!res.ok) {
        const result = await res.json()
        throw new Error(result.message?.[0] || 'Failed to update tenant')
      }

      onClose()
      onSuccess?.()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update tenant')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setError(null)
      setDominioError(null)
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
      <Box component='form' onSubmit={handleSubmit}>
        <DialogTitle sx={{ p: 0, mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <i className='ri-edit-line' style={{ fontSize: '1.5rem', color: 'primary.main' }} />
              Editar Tenant
            </Box>
            <IconButton onClick={handleClose} disabled={loading} size='small'>
              <i className='ri-close-line' />
            </IconButton>
          </Box>
        </DialogTitle>

        <Divider sx={{ mb: 3 }} />

        {error && (
          <Alert severity='error' sx={{ mb: 3 }} role='alert'>
            {error}
          </Alert>
        )}

        <DialogContent sx={{ p: 1 }}>
          <Stack spacing={3}>
            <TextField
              label='Nombre de la Empresa'
              placeholder='Mi Empresa S.A. de C.V.'
              value={form.companyName}
              onChange={handleChange('companyName')}
              required
              fullWidth
              inputProps={{ maxLength: 200 }}
              disabled={loading}
            />

            <TextField
              label='Dominio'
              placeholder='miempresa'
              value={form.dominio}
              onChange={handleChange('dominio')}
              required
              fullWidth
              error={Boolean(dominioError)}
              helperText={dominioError || 'Dominio principal sin https://'}
              disabled={loading}
            />

            <TextField
              select
              label='Plan de Suscripción'
              value={form.subscriptionPlan}
              onChange={handleChange('subscriptionPlan')}
              fullWidth
              disabled={loading}
            >
              {subscriptionPlans.map(option => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label='Límite de Usuarios'
              type='number'
              placeholder='Dejar vacío para ilimitado'
              value={form.maxUsers}
              onChange={handleChange('maxUsers')}
              fullWidth
              disabled={loading}
              inputProps={{ min: 1 }}
            />

            <TextField
              label='Región'
              placeholder='México, USA, etc.'
              value={form.region}
              onChange={handleChange('region')}
              fullWidth
              disabled={loading}
            />
          </Stack>
        </DialogContent>

        <DialogActions sx={{ mt: 4, p: 0 }}>
          <Button variant='outlined' onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type='submit' variant='contained' disabled={loading}>
            {loading ? <CircularProgress size={20} color='inherit' /> : 'Guardar Cambios'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}
