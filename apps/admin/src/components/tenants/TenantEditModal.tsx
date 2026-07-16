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
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Typography from '@mui/material/Typography'
import type { TenantRow } from '@/services/tenant-service'
import { toast } from 'react-toastify'

const DOMAIN_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9-]*/

function validateDomain(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed) return false

  return DOMAIN_REGEX.test(trimmed)
}

interface PlanOption {
  id: number
  name: string
  displayName: string
  monthlyPrice: number
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
  const [plans, setPlans] = useState<PlanOption[]>([])
  const [currentSubscriptionId, setCurrentSubscriptionId] = useState<string | null>(null)
  const [currentPlanId, setCurrentPlanId] = useState<number | null>(null)
  const [dominioError, setDominioError] = useState<string | null>(null)
  const [form, setForm] = useState({
    companyName: '',
    dominio: '',
    planId: '' as string,
    region: ''
  })

  useEffect(() => {
    if (open) {
      fetch('/api/admin/plans')
        .then(r => r.json())
        .then(data => setPlans(data.plans ?? []))
        .catch(() => {})

      if (tenant) {
        fetch(`/api/admin/tenants/${tenant.TenantID}/subscription`)
          .then(r => r.json())
          .then(data => {
            const sub = data.subscription
            setCurrentSubscriptionId(sub?.subscriptionId ?? null)
            setCurrentPlanId(sub?.planId ?? null)
            setForm(prev => ({ ...prev, planId: sub?.planId ? String(sub.planId) : '' }))
          })
          .catch(() => {})
      }
    }
  }, [open, tenant])

  useEffect(() => {
    if (tenant) {
      setForm(prev => ({
        ...prev,
        companyName: tenant.CompanyName,
        dominio: tenant.Dominio ?? '',
        region: tenant.Region ?? ''
      }))
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
    setDominioError(null)

    const dominio = form.dominio.trim()
    if (!validateDomain(dominio)) {
      setDominioError('Ingresa un dominio válido (ej. empresa.com)')
      setLoading(false)
      return
    }

    const tenantData = {
      companyName: form.companyName,
      dominio,
      region: form.region || undefined
    }

    try {
      const res = await fetch(`/api/admin/tenants/${tenant.TenantID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tenantData)
      })

      if (!res.ok) {
        const result = await res.json()
        throw new Error(result.message?.[0] || 'Failed to update tenant')
      }

      if (form.planId && Number(form.planId) !== currentPlanId) {
        const method = currentSubscriptionId ? 'PUT' : 'POST'
        const body = currentSubscriptionId
          ? { subscriptionId: currentSubscriptionId, planId: Number(form.planId), adminUserId: 0, adminEmail: 'admin@gaso.com' }
          : { planId: Number(form.planId), adminUserId: 0, adminEmail: 'admin@gaso.com' }

        const subRes = await fetch(`/api/admin/tenants/${tenant.TenantID}/subscription`, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        })

        if (!subRes.ok) {
          const subResult = await subRes.json()
          throw new Error(subResult.message || 'Failed to update plan')
        }
      }

      toast.success('Tenant actualizado exitosamente')
      onClose()
      onSuccess?.()
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update tenant')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
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
              value={form.planId}
              onChange={handleChange('planId')}
              fullWidth
              disabled={loading}
            >
              <MenuItem value=''>Sin plan</MenuItem>
              {plans.map(plan => (
                <MenuItem key={plan.id} value={String(plan.id)}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                    <span>{plan.displayName}</span>
                    <Typography variant='body2' color='text.secondary' sx={{ ml: 2 }}>
                      ${plan.monthlyPrice}/mes
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </TextField>

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
