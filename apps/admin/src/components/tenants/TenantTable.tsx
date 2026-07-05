'use client'

import { useState, useTransition, useCallback, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TablePagination from '@mui/material/TablePagination'
import Paper from '@mui/material/Paper'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import LinearProgress from '@mui/material/LinearProgress'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import Divider from '@mui/material/Divider'
import Checkbox from '@mui/material/Checkbox'
import Alert from '@mui/material/Alert'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import type { TenantRow, TenantStatus } from '@/services/tenant-service'
import TenantStatusBadge from './TenantStatusBadge'
import EmptyState from '@/components/shared/EmptyState'

type SortField = 'CompanyName' | 'Status' | 'CreatedAt' | 'SubscriptionPlan'
type SortDir = 'asc' | 'desc'

interface TenantTableProps {
  tenants: TenantRow[]
  total: number
  page: number
  pageSize: number
  status: TenantStatus | null
  search: string | null
  adminTenantDomain?: string
  onView?: (tenant: TenantRow) => void
  onEdit?: (tenant: TenantRow) => void
  onSuspend?: (tenant: TenantRow) => void
  onActivate?: (tenant: TenantRow) => void
  onDeactivate?: (tenant: TenantRow) => void
  onCreate?: () => void
  onBulkSuspend?: (tenants: TenantRow[]) => void
  onBulkActivate?: (tenants: TenantRow[]) => void
  onBulkDeactivate?: (tenants: TenantRow[]) => void
}

function SortIcon({ field, current, direction }: { field: SortField; current: SortField; direction: SortDir }) {
  if (field !== current) return <i className='ri-expand-sorter-line' style={{ opacity: 0.3, fontSize: '0.875rem' }} />
  return direction === 'asc'
    ? <i className='ri-arrow-up-s-line' style={{ fontSize: '0.875rem' }} />
    : <i className='ri-arrow-down-s-line' style={{ fontSize: '0.875rem' }} />
}

function BulkActionToolbar({
  selected,
  onClear,
  onSuspend,
  onActivate,
  onDeactivate
}: {
  selected: TenantRow[]
  onClear: () => void
  onSuspend: () => void
  onActivate: () => void
  onDeactivate: () => void
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        p: 1.5,
        // bgcolor: 'primary.main',
        color: 'primary.contrastText',
        borderRadius: 1,
        mb: 1.5
      }}
    >
      <Typography variant='body2' fontWeight='bold'>
        {selected.length} seleccionado{selected.length !== 1 ? 's' : ''}
      </Typography>
      <Stack direction='row' spacing={1}>
        {selected.some(t => t.Status === 'SUSPENDED' || t.Status === 'INACTIVE') && (
          <Button
            size='small'
            variant='contained'
            color='success'
            onClick={onActivate}
            startIcon={<i className='ri-play-circle-line' />}
          >
            Activar
          </Button>
        )}
        {selected.some(t => t.Status === 'ACTIVE' || t.Status === 'TRIAL') && (
          <Button
            size='small'
            variant='contained'
            color='warning'
            onClick={onSuspend}
            startIcon={<i className='ri-pause-circle-line' />}
          >
            Suspender
          </Button>
        )}
        {selected.some(t => t.Status !== 'INACTIVE') && (
          <Button
            size='small'
            variant='contained'
            color='error'
            onClick={onDeactivate}
            startIcon={<i className='ri-close-circle-line' />}
          >
            Desactivar
          </Button>
        )}
      </Stack>
      <Button size='small' onClick={onClear} sx={{ color: 'inherit', ml: 'auto' }}>
        Cancelar
      </Button>
    </Box>
  )
}

function BulkConfirmDialog({
  open,
  title,
  tenants,
  onConfirm,
  onCancel,
  loading
}: {
  open: boolean
  title: string
  tenants: TenantRow[]
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}) {
  const [reason, setReason] = useState('')

  return (
    <Dialog open={open} onClose={onCancel} maxWidth='sm' fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Typography variant='body2' color='text.secondary' gutterBottom>
          Los siguientes tenants serán afectados:
        </Typography>
        <Box sx={{ my: 1.5, maxHeight: 200, overflow: 'auto' }}>
          {tenants.map(t => (
            <Box key={t.TenantID} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5 }}>
              <i className='ri-building-line' style={{ fontSize: '1rem', color: 'text.secondary' }} />
              <Typography variant='body2'>{t.CompanyName}</Typography>
              <Typography variant='caption' color='text.secondary'>({t.Dominio})</Typography>
            </Box>
          ))}
        </Box>
        {title.includes('Suspender') && (
          <TextField
            autoFocus
            label='Razón de suspensión'
            fullWidth
            multiline
            rows={2}
            value={reason}
            onChange={e => setReason(e.target.value)}
            sx={{ mt: 1 }}
            disabled={loading}
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={loading}>Cancelar</Button>
        <Button
          onClick={onConfirm}
          variant='contained'
          color={title.includes('Activar') ? 'success' : title.includes('Suspender') ? 'warning' : 'error'}
          disabled={loading || (title.includes('Suspender') && !reason.trim())}
        >
          {loading ? <CircularProgress size={20} color='inherit' /> : title}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

import * as React from 'react'

export default function TenantTable({
  tenants,
  total,
  page,
  pageSize,
  status,
  search,
  adminTenantDomain,
  onView,
  onEdit,
  onSuspend,
  onActivate,
  onDeactivate,
  onCreate,
  onBulkSuspend,
  onBulkActivate,
  onBulkDeactivate
}: TenantTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mounted, setMounted] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [pageNum, setPageNum] = useState(page)
  const [rowsPerPage, setRowsPerPage] = useState(pageSize)
  const [sortField, setSortField] = useState<SortField>('CreatedAt')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const safeTenants: TenantRow[] = Array.isArray(tenants) ? tenants : []

  const [selected, setSelected] = useState<TenantRow[]>([])
  const [menuAnchor, setMenuAnchor] = useState<{ el: HTMLElement; tenant: TenantRow } | null>(null)
  const [bulkDialog, setBulkDialog] = useState<{ title: string; tenants: TenantRow[]; action: 'suspend' | 'activate' | 'deactivate' } | null>(null)
  const [bulkLoading, setBulkLoading] = useState(false)

  useEffect(() => {
    setSortField((searchParams.get('sort') as SortField) || 'CreatedAt')
    setSortDir((searchParams.get('dir') as SortDir) || 'desc')
    setMounted(true)
  }, [searchParams])

  const isMainTenant = (tenant: TenantRow | undefined) =>
    adminTenantDomain && tenant ? tenant.Dominio === adminTenantDomain : false

  const buildUrl = useCallback((overrides: Record<string, string | number | null> = {}) => {
    const params = new URLSearchParams()
    params.set('page', String(overrides.page ?? pageNum + 1))
    params.set('pageSize', String(overrides.pageSize ?? rowsPerPage))
    if (status) params.set('status', status)
    if (search) params.set('search', search)
    if (overrides.sort) params.set('sort', String(overrides.sort))
    if (overrides.dir) params.set('dir', String(overrides.dir))
    return `/admin/tenants?${params.toString()}`
  }, [pageNum, rowsPerPage, status, search])

  const handleChangePage = (_: unknown, newPage: number) => {
    setPageNum(newPage)
    startTransition(() => {
      router.push(buildUrl({ page: newPage + 1 }))
    })
  }

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newSize = parseInt(event.target.value, 10)
    setRowsPerPage(newSize)
    setPageNum(0)
    startTransition(() => {
      router.push(buildUrl({ page: 1, pageSize: newSize }))
    })
  }

  const handleSort = (field: SortField) => {
    const newDir = field === sortField && sortDir === 'asc' ? 'desc' : 'asc'
    setSortField(field)
    setSortDir(newDir)
    startTransition(() => {
      router.push(buildUrl({ sort: field, dir: newDir, page: 1 }))
    })
  }

  const formatDate = (date: Date | null | undefined) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const handleMenuOpen = (e: React.MouseEvent<HTMLElement>, tenant: TenantRow) => {
    e.stopPropagation()
    setMenuAnchor({ el: e.currentTarget, tenant })
  }

  const handleMenuClose = () => {
    setMenuAnchor(null)
  }

  const navigateTo = (path: string) => {
    handleMenuClose()
    router.push(path)
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelected(tenants.filter(t => !isMainTenant(t)))
    } else {
      setSelected([])
    }
  }

  const handleSelectOne = (tenant: TenantRow, checked: boolean) => {
    if (checked) {
      setSelected(prev => [...prev, tenant])
    } else {
      setSelected(prev => prev.filter(t => t.TenantID !== tenant.TenantID))
    }
  }

  const performBulkAction = async (action: 'suspend' | 'activate' | 'deactivate', reason?: string) => {
    setBulkLoading(true)
    const actionMap = { suspend: 'suspend', activate: 'activate', deactivate: 'deactivate' }
    const body = reason ? { reason } : undefined

    try {
      await Promise.all(
        bulkDialog!.tenants.map(t =>
          fetch(`/api/admin/tenants/${t.TenantID}/${actionMap[action]}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: body ? JSON.stringify(body) : undefined
          })
        )
      )
      router.refresh()
      setBulkDialog(null)
      setSelected([])
    } finally {
      setBulkLoading(false)
    }
  }

  if (!tenants.length) {
    const hasFilters = Boolean(search || status)
    return (
      <Paper sx={{ width: '100%' }}>
        <EmptyState
          icon='ri-building-line'
          title={hasFilters ? 'Sin resultados' : 'No hay tenants registrados'}
          description={
            hasFilters
              ? 'No hay tenants que coincidan con los filtros seleccionados.'
              : 'Crea tu primer tenant para comenzar a gestionar empresas en la plataforma.'
          }
          actionLabel={hasFilters ? undefined : 'Crear Primer Tenant'}
          onAction={hasFilters ? undefined : onCreate}
          secondaryActionLabel={hasFilters ? 'Limpiar filtros' : undefined}
          onSecondaryAction={hasFilters ? () => router.push('/admin/tenants') : undefined}
        />
      </Paper>
    )
  }

  const sortedTenants = [...safeTenants].sort((a, b) => {
    let cmp = 0
    if (sortField === 'CompanyName') cmp = (a.CompanyName || '').localeCompare(b.CompanyName || '')
    else if (sortField === 'Status') cmp = a.Status.localeCompare(b.Status)
    else if (sortField === 'CreatedAt') {
      const da = a.CreatedAt ? new Date(a.CreatedAt).getTime() : 0
      const db = b.CreatedAt ? new Date(b.CreatedAt).getTime() : 0
      cmp = da - db
    } else if (sortField === 'SubscriptionPlan') cmp = (a.SubscriptionPlan || '').localeCompare(b.SubscriptionPlan || '')
    return sortDir === 'asc' ? cmp : -cmp
  })

  const selectableTenants = sortedTenants.filter(t => !isMainTenant(t))
  const allSelectableSelected = selectableTenants.length > 0 && selectableTenants.every(t => selected.some(s => s.TenantID === t.TenantID))

  return (
    <>
      {selected.length > 0 && (
        <BulkActionToolbar
          selected={selected}
          onClear={() => setSelected([])}
          onSuspend={() => onBulkSuspend ? onBulkSuspend(selected) : setBulkDialog({ title: 'Suspender tenants', tenants: selected, action: 'suspend' })}
          onActivate={() => onBulkActivate ? onBulkActivate(selected) : setBulkDialog({ title: 'Activar tenants', tenants: selected, action: 'activate' })}
          onDeactivate={() => onBulkDeactivate ? onBulkDeactivate(selected) : setBulkDialog({ title: 'Desactivar tenants', tenants: selected, action: 'deactivate' })}
        />
      )}

      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        {isPending && <LinearProgress sx={{ position: 'absolute', top: 0, left: 0, right: 0 }} />}
        <TableContainer sx={{ maxHeight: 600 }}>
          <Table stickyHeader size='small'>
            <TableHead>
              <TableRow>
                <TableCell padding='checkbox'>
                  <Checkbox
                    size='small'
                    checked={allSelectableSelected}
                    indeterminate={selected.length > 0 && !allSelectableSelected}
                    onChange={(_, checked) => handleSelectAll(checked)}
                    aria-label='Seleccionar todos'
                  />
                </TableCell>
                <TableCell
                  scope='col'
                  sx={{ cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => handleSort('CompanyName')}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    Empresa
                    <SortIcon field='CompanyName' current={sortField} direction={sortDir} />
                  </Box>
                </TableCell>
                <TableCell scope='col'>Dominio</TableCell>
                <TableCell
                  scope='col'
                  sx={{ cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => handleSort('Status')}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    Estado
                    <SortIcon field='Status' current={sortField} direction={sortDir} />
                  </Box>
                </TableCell>
                <TableCell
                  scope='col'
                  sx={{ cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => handleSort('SubscriptionPlan')}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    Plan
                    <SortIcon field='SubscriptionPlan' current={sortField} direction={sortDir} />
                  </Box>
                </TableCell>
                <TableCell scope='col'>Usuarios</TableCell>
                <TableCell
                  scope='col'
                  sx={{ cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => handleSort('CreatedAt')}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    Creado
                    <SortIcon field='CreatedAt' current={sortField} direction={sortDir} />
                  </Box>
                </TableCell>
                <TableCell scope='col' align='right'>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedTenants.map(tenant => {
                const locked = isMainTenant(tenant)
                const isSelected = selected.some(s => s.TenantID === tenant.TenantID)
                return (
                  <TableRow
                    key={tenant.TenantID}
                    hover
                    sx={{ cursor: 'pointer', bgcolor: isSelected ? 'action.selected' : undefined }}
                    onClick={() => onView ? onView(tenant) : router.push(`/admin/tenants/${tenant.TenantID}`)}
                    aria-label={`Ver detalles de ${tenant.CompanyName}`}
                  >
                    <TableCell padding='checkbox' onClick={e => e.stopPropagation()}>
                      <Checkbox
                        size='small'
                        checked={isSelected}
                        disabled={locked}
                        onChange={(_, checked) => handleSelectOne(tenant, checked)}
                        aria-label={`Seleccionar ${tenant.CompanyName}`}
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography fontWeight='medium'>{tenant.CompanyName}</Typography>
                        {locked && (
                          <Box
                            component='span'
                            title='Tenant principal — no editable'
                            sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center' }}
                          >
                            <i className='ri-lock-line' style={{ fontSize: '0.875rem' }} />
                          </Box>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>{tenant.Dominio}</TableCell>
                    <TableCell>
                      <TenantStatusBadge status={tenant.Status} locked={locked} />
                    </TableCell>
                    <TableCell>{tenant.SubscriptionPlan || '-'}</TableCell>
                    <TableCell>{tenant.MaxUsers ?? '∞'}</TableCell>
                    <TableCell>{formatDate(tenant.CreatedAt)}</TableCell>
                    <TableCell align='right' onClick={e => e.stopPropagation()}>
                      <IconButton
                        size='small'
                        onClick={e => handleMenuOpen(e, tenant)}
                        aria-label={`Abrir acciones para ${tenant.CompanyName}`}
                      >
                        <i className='ri-more-2-fill' />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[10, 20, 50]}
          component='div'
          count={total}
          rowsPerPage={rowsPerPage}
          page={pageNum}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage='Filas por página:'
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
        />
      </Paper>

      <Menu
        anchorEl={menuAnchor?.el}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        PaperProps={{ sx: { minWidth: 180 } }}
      >
        <MenuItem onClick={() => { handleMenuClose(); onView ? onView(menuAnchor!.tenant) : navigateTo(`/admin/tenants/${menuAnchor?.tenant.TenantID}`) }}>
          <ListItemIcon><i className='ri-eye-line' /></ListItemIcon>
          Ver detalles
        </MenuItem>
        {menuAnchor?.tenant && !isMainTenant(menuAnchor?.tenant) && [
          menuAnchor?.tenant.Status === 'ACTIVE' && (
            <MenuItem key='edit' onClick={() => { handleMenuClose(); onEdit ? onEdit(menuAnchor!.tenant) : navigateTo(`/admin/tenants/${menuAnchor?.tenant.TenantID}/edit`) }}>
              <ListItemIcon><i className='ri-edit-line' /></ListItemIcon>
              Editar
            </MenuItem>
          ),
          menuAnchor?.tenant.Status !== 'INACTIVE' && (
            <Divider key='divider' />
          ),
          menuAnchor?.tenant.Status === 'SUSPENDED' && (
            <MenuItem key='activate' onClick={() => { handleMenuClose(); onActivate?.(menuAnchor!.tenant) }}>
              <ListItemIcon><i className='ri-play-circle-line' /></ListItemIcon>
              Activar
            </MenuItem>
          ),
          menuAnchor?.tenant.Status === 'ACTIVE' && (
            <MenuItem key='suspend' onClick={() => { handleMenuClose(); onSuspend?.(menuAnchor!.tenant) }}>
              <ListItemIcon><i className='ri-pause-circle-line' /></ListItemIcon>
              Suspender
            </MenuItem>
          ),
          menuAnchor?.tenant.Status !== 'INACTIVE' && (
            <MenuItem key='deactivate' onClick={() => { handleMenuClose(); onDeactivate?.(menuAnchor!.tenant) }}>
              <ListItemIcon><i className='ri-close-circle-line' /></ListItemIcon>
              Desactivar
            </MenuItem>
          )
        ]}
      </Menu>

      {bulkDialog && (
        <BulkConfirmDialog
          open={Boolean(bulkDialog)}
          title={bulkDialog.title}
          tenants={bulkDialog.tenants}
          onConfirm={() => performBulkAction(bulkDialog.action, bulkDialog.action === 'suspend' ? '' : undefined)}
          onCancel={() => setBulkDialog(null)}
          loading={bulkLoading}
        />
      )}
    </>
  )
}
