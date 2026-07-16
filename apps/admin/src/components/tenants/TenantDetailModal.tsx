'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import IconButton from '@mui/material/IconButton'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import CircularProgress from '@mui/material/CircularProgress'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import type { TenantRow } from '@/services/tenant-service'
import type { TransactionLogEntry } from '@gaso/shared'
import TenantStatusBadge from './TenantStatusBadge'
import TenantAuditTimeline from './TenantAuditTimeline'

interface TenantDetailModalProps {
  open: boolean
  onClose: () => void
  tenant: TenantRow | null
  adminTenantDomain?: string
  onEdit?: (tenant: TenantRow) => void
  onSuspend?: (tenant: TenantRow) => void
  onActivate?: (tenant: TenantRow) => void
  onDeactivate?: (tenant: TenantRow) => void
}

interface TenantDetailModalProps {
  open: boolean
  onClose: () => void
  tenant: TenantRow | null
  adminTenantDomain?: string
  onEdit?: (tenant: TenantRow) => void
  onSuspend?: (tenant: TenantRow) => void
  onActivate?: (tenant: TenantRow) => void
  onDeactivate?: (tenant: TenantRow) => void
}

export default function TenantDetailModal({
  open,
  onClose,
  tenant,
  adminTenantDomain,
  onEdit,
  onSuspend,
  onActivate,
  onDeactivate
}: TenantDetailModalProps) {
  const router = useRouter()
  const [auditEntries, setAuditEntries] = useState<TransactionLogEntry[]>([])
  const [loadingAudit, setLoadingAudit] = useState(false)
  const [auditError, setAuditError] = useState<string | null>(null)

  const isLocked = adminTenantDomain ? tenant?.Dominio === adminTenantDomain : false

  useEffect(() => {
    if (open && tenant) {
      setLoadingAudit(true)
      setAuditError(null)
      fetch(`/api/admin/tenants/${tenant.TenantID}/audit?page=1&pageSize=20`)
        .then(res => res.json())
        .then(data => {
          setAuditEntries(data.entries || [])
          setLoadingAudit(false)
        })
        .catch(() => {
          setAuditError('No se pudo cargar el historial')
          setLoadingAudit(false)
        })
    }
  }, [open, tenant])

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return '-'
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleClose = () => {
    setAuditEntries([])
    setAuditError(null)
    onClose()
  }

  if (!tenant) return null

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth='md'
      fullWidth
      PaperProps={{ sx: { maxHeight: '90vh', display: 'flex', flexDirection: 'column' } }}
    >
      <DialogTitle sx={{ p: 3, pb: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant='h5' fontWeight='bold'>
              {tenant.CompanyName}
            </Typography>
            <TenantStatusBadge status={tenant.Status} locked={isLocked} />
          </Box>
          <IconButton onClick={handleClose} size='small'>
            <i className='ri-close-line' />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 3, overflow: 'auto' }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant='h6' fontWeight='bold' gutterBottom>
                  Información del Tenant
                </Typography>
                <Divider sx={{ mb: 2 }} />

                <Stack spacing={2}>
                  <Box>
                    <Typography variant='body2' color='text.secondary'>
                      Dominio
                    </Typography>
                    <Typography>{tenant.Dominio}</Typography>
                  </Box>

                  <Box>
                    <Typography variant='body2' color='text.secondary'>
                      Región
                    </Typography>
                    <Typography>{tenant.Region || 'No especificada'}</Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant='h6' fontWeight='bold' gutterBottom>
                  Fechas y Estado
                </Typography>
                <Divider sx={{ mb: 2 }} />

                <Stack spacing={2}>
                  <Box>
                    <Typography variant='body2' color='text.secondary'>
                      Fecha de creación
                    </Typography>
                    <Typography>{formatDate(tenant.CreatedAt)}</Typography>
                  </Box>

                  <Box>
                    <Typography variant='body2' color='text.secondary'>
                      Última actualización
                    </Typography>
                    <Typography>{formatDate(tenant.UpdatedAt)}</Typography>
                  </Box>

                  {tenant.SuspendedAt && (
                    <Box>
                      <Typography variant='body2' color='text.secondary'>
                        Fecha de suspensión
                      </Typography>
                      <Typography>{formatDate(tenant.SuspendedAt)}</Typography>
                    </Box>
                  )}

                  {tenant.SuspendedReason && (
                    <Box>
                      <Typography variant='body2' color='text.secondary'>
                        Razón de suspensión
                      </Typography>
                      <Typography>{tenant.SuspendedReason}</Typography>
                    </Box>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant='h6' fontWeight='bold' gutterBottom>
                  Historial de Cambios
                </Typography>
                <Divider sx={{ mb: 2 }} />

                {loadingAudit && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress size={24} />
                  </Box>
                )}

                {auditError && (
                  <Alert severity='error' sx={{ mb: 2 }}>
                    {auditError}
                  </Alert>
                )}

                {!loadingAudit && !auditError && (
                  <TenantAuditTimeline entries={auditEntries} />
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </DialogContent>

      {!isLocked && (
        <Box sx={{ p: 3, pt: 1, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          {tenant.Status !== 'INACTIVE' && (
            <Button
              variant='outlined'
              onClick={() => { handleClose(); onEdit?.(tenant) }}
              startIcon={<i className='ri-edit-line' />}
            >
              Editar
            </Button>
          )}
          {tenant.Status === 'SUSPENDED' && (
            <Button
              variant='contained'
              color='success'
              onClick={() => { handleClose(); onActivate?.(tenant) }}
              startIcon={<i className='ri-play-circle-line' />}
            >
              Activar
            </Button>
          )}
          {(tenant.Status === 'ACTIVE' || tenant.Status === 'TRIAL') && (
            <Button
              variant='contained'
              color='warning'
              onClick={() => { handleClose(); onSuspend?.(tenant) }}
              startIcon={<i className='ri-pause-circle-line' />}
            >
              Suspender
            </Button>
          )}
          {tenant.Status !== 'INACTIVE' && (
            <Button
              variant='contained'
              color='error'
              onClick={() => { handleClose(); onDeactivate?.(tenant) }}
              startIcon={<i className='ri-close-circle-line' />}
            >
              Desactivar
            </Button>
          )}
        </Box>
      )}
    </Dialog>
  )
}
