'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from '@mui/material/styles'

import Button from '@mui/material/Button'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import Alert from '@mui/material/Alert'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import CircularProgress from '@mui/material/CircularProgress'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import type { TenantRow } from '@/services/tenant-service'

interface TenantActionsMenuProps {
  tenant: TenantRow
  adminTenantDomain?: string
}

export default function TenantActionsMenu({ tenant, adminTenantDomain }: TenantActionsMenuProps) {
  const theme = useTheme()
  const router = useRouter()
  if (!tenant?.Dominio) return null
  const isLocked = adminTenantDomain ? tenant.Dominio === adminTenantDomain : false
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false)
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false)
  const [suspendReason, setSuspendReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    if (!actionLoading) {
      setAnchorEl(null)
    }
  }

  const handleAction = async (action: string, body?: Record<string, unknown>) => {
    setActionLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/admin/tenants/${tenant.TenantID}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message?.[0] || 'Action failed')
      }

      router.refresh()
      handleMenuClose()
      setSuspendDialogOpen(false)
      setSuspendReason('')
      setDeactivateDialogOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <>
      <Button
        variant='contained'
        onClick={handleMenuOpen}
        disabled={actionLoading}
        endIcon={actionLoading ? <CircularProgress size={16} color='inherit' /> : null}
        aria-label='Abrir menú de acciones'
      >
        Acciones
      </Button>

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem
          onClick={() => router.push(`/admin/tenants/${tenant.TenantID}`)}
          disabled={actionLoading}
          aria-label='Ver detalles del tenant'
        >
          <ListItemIcon><i className='ri-eye-line' /></ListItemIcon>
          Ver detalles
        </MenuItem>

        <MenuItem
          onClick={() => router.push(`/admin/tenants/${tenant.TenantID}/edit`)}
          disabled={actionLoading}
          aria-label='Editar tenant'
        >
          <ListItemIcon><i className='ri-edit-line' /></ListItemIcon>
          Editar
        </MenuItem>

        <Divider />

        {!isLocked && tenant.Status === 'SUSPENDED' && (
          <MenuItem
            onClick={() => handleAction('activate')}
            disabled={actionLoading}
            aria-label='Activar tenant'
          >
            <ListItemIcon><i className='ri-play-circle-line' /></ListItemIcon>
            Activar
          </MenuItem>
        )}

        {!isLocked && tenant.Status === 'ACTIVE' && (
          <MenuItem
            onClick={() => setSuspendDialogOpen(true)}
            disabled={actionLoading}
            aria-label='Suspender tenant'
          >
            <ListItemIcon><i className='ri-pause-circle-line' /></ListItemIcon>
            Suspender
          </MenuItem>
        )}

        {!isLocked && tenant.Status !== 'INACTIVE' && (
          <MenuItem
            onClick={() => setDeactivateDialogOpen(true)}
            disabled={actionLoading}
            aria-label='Desactivar tenant'
          >
            <ListItemIcon><i className='ri-close-circle-line' /></ListItemIcon>
            Desactivar
          </MenuItem>
        )}
      </Menu>

      <Dialog
        open={suspendDialogOpen}
        onClose={() => !actionLoading && setSuspendDialogOpen(false)}
        aria-labelledby='suspend-dialog-title'
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle id='suspend-dialog-title'>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <i className='ri-pause-circle-line' style={{ color: theme.palette.warning.main, fontSize: '1.5rem' }} />
            Suspender Tenant
          </Box>
        </DialogTitle>
        <DialogContent>
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
            disabled={actionLoading}
            aria-describedby='suspend-reason-helper'
            placeholder='Describe la razón de la suspensión...'
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSuspendDialogOpen(false)} disabled={actionLoading}>
            Cancelar
          </Button>
          <Button
            onClick={() => handleAction('suspend', { reason: suspendReason })}
            color='warning'
            variant='contained'
            disabled={!suspendReason.trim() || actionLoading}
          >
            {actionLoading ? <CircularProgress size={20} color='inherit' /> : 'Suspender'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={deactivateDialogOpen}
        onClose={() => !actionLoading && setDeactivateDialogOpen(false)}
        aria-labelledby='deactivate-dialog-title'
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle id='deactivate-dialog-title'>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <i className='ri-error-warning-line' style={{ color: theme.palette.error.main, fontSize: '1.5rem' }} />
            Desactivar Tenant
          </Box>
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity='error' sx={{ mb: 2 }} role='alert'>
              {error}
            </Alert>
          )}

          <Box sx={{ mb: 2 }}>
            <Typography variant='body2' color='text.secondary' gutterBottom>
              Vas a desactivar:
            </Typography>
            <Typography fontWeight='bold'>{tenant.CompanyName}</Typography>
            <Typography variant='caption' color='text.secondary'>{tenant.Dominio}</Typography>
          </Box>

          <Alert severity='error'>
            <Typography variant='body2' fontWeight='bold' gutterBottom>Consecuencias:</Typography>
            <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
              <li>Todos los usuarios perderán acceso inmediatamente</li>
              <li>Las sesiones activas se cerrarán</li>
              <li>Nadie podrá iniciar sesión hasta que sea reactivado</li>
              <li>Esta acción puede requerir intervención manual para revertir</li>
            </ul>
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeactivateDialogOpen(false)} disabled={actionLoading}>
            Cancelar
          </Button>
          <Button
            onClick={() => handleAction('deactivate')}
            color='error'
            variant='contained'
            disabled={actionLoading}
          >
            {actionLoading ? <CircularProgress size={20} color='inherit' /> : 'Desactivar'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
