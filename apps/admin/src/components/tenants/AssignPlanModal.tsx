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
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'

interface PlanOption {
  id: number
  name: string
  displayName: string
  monthlyPrice: number
}

interface AssignPlanModalProps {
  open: boolean
  onClose: () => void
  tenantId: string
  currentPlanId?: number
  currentSubscriptionId?: string
  adminUserId: number
  adminEmail: string
}

export default function AssignPlanModal({
  open,
  onClose,
  tenantId,
  currentPlanId,
  currentSubscriptionId,
  adminUserId,
  adminEmail
}: AssignPlanModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [plans, setPlans] = useState<PlanOption[]>([])
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ planId: '', expiresAt: '' })

  useEffect(() => {
    if (open) {
      fetch('/api/admin/plans')
        .then(r => r.json())
        .then(data => {
          setPlans(data.plans ?? [])
          if (!form.planId) {
            setForm(prev => ({
              ...prev,
              planId: currentPlanId ? String(currentPlanId) : (data.plans?.[0]?.id ? String(data.plans[0].id) : '')
            }))
          }
        })
        .catch(() => {})
    }
  }, [open])

  useEffect(() => {
    if (currentPlanId && open) {
      setForm(prev => ({ ...prev, planId: String(currentPlanId) }))
    }
  }, [currentPlanId, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (!form.planId) {
      setError('Selecciona un plan')
      setLoading(false)
      return
    }

    try {
      if (currentSubscriptionId) {
        const res = await fetch(`/api/admin/tenants/${tenantId}/subscription`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscriptionId: currentSubscriptionId,
            planId: Number(form.planId),
            expiresAt: form.expiresAt || null,
            adminUserId,
            adminEmail
          })
        })

        if (!res.ok) {
          const result = await res.json()
          throw new Error(result.message || 'Error al actualizar el plan')
        }
      } else {
        const res = await fetch(`/api/admin/tenants/${tenantId}/subscription`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            planId: Number(form.planId),
            expiresAt: form.expiresAt || null,
            adminUserId,
            adminEmail
          })
        })

        if (!res.ok) {
          const result = await res.json()
          throw new Error(result.message || 'Error al asignar el plan')
        }
      }

      setForm({ planId: '', expiresAt: '' })
      onClose()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al asignar el plan')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth='sm' fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {currentSubscriptionId ? 'Cambiar Plan' : 'Asignar Plan'}
        <IconButton onClick={onClose} size='small'>
          <i className='ri-close-line' />
        </IconButton>
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent>
          {error && <Alert severity='error' sx={{ mb: 2 }}>{error}</Alert>}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label='Plan'
              value={form.planId}
              onChange={e => setForm(prev => ({ ...prev, planId: e.target.value }))}
              fullWidth
              select
              required
              size='small'
            >
              {plans.map(plan => (
                <MenuItem key={plan.id} value={plan.id}>
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
              label='Fecha de expiración (opcional)'
              type='date'
              value={form.expiresAt}
              onChange={e => setForm(prev => ({ ...prev, expiresAt: e.target.value }))}
              fullWidth
              size='small'
              InputLabelProps={{ shrink: true }}
              helperText='Dejar vacío para suscripción sin fecha de expiración'
            />
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button type='submit' variant='contained' disabled={loading}>
            {loading ? <CircularProgress size={20} /> : currentSubscriptionId ? 'Guardar Cambios' : 'Asignar Plan'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
