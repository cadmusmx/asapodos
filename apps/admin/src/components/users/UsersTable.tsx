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
import Chip from '@mui/material/Chip'
import EmptyState from '@/components/shared/EmptyState'
import Divider from '@mui/material/Divider'
import type { PlatformUserRow, PlatformRole } from '@/types/apps/platformUserTypes'

interface UsersTableProps {
  users: PlatformUserRow[]
  total: number
  page: number
  pageSize: number
  role: PlatformRole | null
  search: string | null
  oldestUserId: number | null
  onEdit?: (user: PlatformUserRow) => void
  onRemove?: (user: PlatformUserRow) => void
  onDelete?: (user: PlatformUserRow) => void
  onDeactivate?: (user: PlatformUserRow) => void
  onActivate?: (user: PlatformUserRow) => void
}

const roleChipColor: Record<PlatformRole, 'primary' | 'default'> = {
  super_admin: 'primary',
  auditor: 'default',
  support: 'default'
}

const roleLabel: Record<PlatformRole, string> = {
  super_admin: 'Super Admin',
  auditor: 'Auditor',
  support: 'Support'
}

export default function UsersTable({
  users,
  total,
  page,
  pageSize,
  role,
  search,
  oldestUserId,
  onEdit,
  onRemove,
  onDelete,
  onDeactivate,
  onActivate
}: UsersTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mounted, setMounted] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [pageNum, setPageNum] = useState(page)
  const [rowsPerPage, setRowsPerPage] = useState(pageSize)

  const [menuAnchor, setMenuAnchor] = useState<{ el: HTMLElement; user: PlatformUserRow } | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const buildUrl = useCallback((overrides: Record<string, string | number | null> = {}) => {
    const params = new URLSearchParams()
    params.set('page', String(overrides.page ?? pageNum + 1))
    params.set('pageSize', String(overrides.pageSize ?? rowsPerPage))
    if (role) params.set('role', role)
    if (search) params.set('search', search)
    return `/admin/users?${params.toString()}`
  }, [pageNum, rowsPerPage, role, search])

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

  const formatDate = (date: Date | null | undefined) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const handleMenuOpen = (e: React.MouseEvent<HTMLElement>, user: PlatformUserRow) => {
    e.stopPropagation()
    e.preventDefault()
    setMenuAnchor({ el: e.currentTarget, user })
  }

  const handleMenuClose = () => {
    setMenuAnchor(null)
  }

  const isOldest = (user: PlatformUserRow | undefined) => user ? oldestUserId === user.UserID : false

  const safeUsers: PlatformUserRow[] = Array.isArray(users) ? users : []

  if (!safeUsers.length) {
    const hasFilters = Boolean(search || role)
    return (
      <Paper sx={{ width: '100%' }}>
        <EmptyState
          icon='ri-user-settings-line'
          title={hasFilters ? 'Sin resultados' : 'No hay usuarios de plataforma'}
          description={
            hasFilters
              ? 'No hay usuarios que coincidan con los filtros seleccionados.'
              : 'Asigna roles de plataforma (Super Admin o Auditor) a los usuarios.'
          }
          secondaryActionLabel={hasFilters ? 'Limpiar filtros' : undefined}
          onSecondaryAction={hasFilters ? () => router.push('/admin/users') : undefined}
        />
      </Paper>
    )
  }

  return (
    <>
      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        {isPending && <LinearProgress sx={{ position: 'absolute', top: 0, left: 0, right: 0 }} />}
        <TableContainer sx={{ maxHeight: 600 }}>
          <Table stickyHeader size='small'>
            <TableHead>
              <TableRow>
                <TableCell scope='col'>Usuario</TableCell>
                <TableCell scope='col'>Nombre</TableCell>
                <TableCell scope='col'>Email</TableCell>
                <TableCell scope='col'>Estado</TableCell>
                <TableCell scope='col'>Rol</TableCell>
                <TableCell scope='col'>Fecha de Asignación</TableCell>
                <TableCell scope='col' align='right'>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {safeUsers.map(user => {
                const userIsOldest = isOldest(user)
                const isActive = user.Estatus === 'A'
                return (
                  <TableRow
                    key={user.UserID}
                    hover
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography fontWeight='medium'>{user.Usuario}</Typography>
                        {userIsOldest && (
                          <Box title='Usuario más antiguo - no editable' sx={{ color: 'warning.main', display: 'flex' }}>
                            <i className='ri-lock-line' style={{ fontSize: '0.875rem' }} />
                          </Box>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>{user.Nombre}</TableCell>
                    <TableCell>{user.Email || '-'}</TableCell>
                    <TableCell>
                      <Chip
                        label={isActive ? 'Activo' : 'Inactivo'}
                        color={isActive ? 'success' : 'default'}
                        size='small'
                        variant='outlined'
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={roleLabel[user.Role]}
                        color={roleChipColor[user.Role]}
                        size='small'
                        variant='outlined'
                      />
                    </TableCell>
                    <TableCell>{formatDate(user.CreatedAt)}</TableCell>
                    <TableCell align='right' onClick={e => e.stopPropagation()}>
                      {!userIsOldest && (
                        <IconButton
                          size='small'
                          onClick={e => handleMenuOpen(e, user)}
                          aria-label={`Abrir acciones para ${user.Nombre}`}
                        >
                          <i className='ri-more-2-fill' />
                        </IconButton>
                      )}
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
        PaperProps={{ sx: { minWidth: 200 } }}
      >
        <MenuItem
          onClick={() => {
            if (menuAnchor?.user) onEdit?.(menuAnchor.user)
            handleMenuClose()
          }}
          disabled={isOldest(menuAnchor?.user!)}
        >
          <ListItemIcon><i className='ri-edit-line' /></ListItemIcon>
          Editar usuario
        </MenuItem>

        {menuAnchor?.user?.Estatus === 'A' ? (
          <MenuItem
            onClick={() => {
              if (menuAnchor?.user) onDeactivate?.(menuAnchor.user)
              handleMenuClose()
            }}
            disabled={isOldest(menuAnchor?.user!)}
          >
            <ListItemIcon><i className='ri-forbid-line' /></ListItemIcon>
            Desactivar usuario
          </MenuItem>
        ) : (
          <MenuItem
            onClick={() => {
              if (menuAnchor?.user) onActivate?.(menuAnchor.user)
              handleMenuClose()
            }}
          >
            <ListItemIcon><i className='ri-checkbox-circle-line' /></ListItemIcon>
            Activar usuario
          </MenuItem>
        )}

        <Divider />

        <MenuItem
          onClick={() => {
            if (menuAnchor?.user) onRemove?.(menuAnchor.user)
            handleMenuClose()
          }}
          disabled={isOldest(menuAnchor?.user!)}
          sx={{ color: 'warning.main' }}
        >
          <ListItemIcon><i className='ri-user-unfollow-line' style={{ color: 'inherit' }} /></ListItemIcon>
          Remover rol
        </MenuItem>

        <MenuItem
          onClick={() => {
            if (menuAnchor?.user) onDelete?.(menuAnchor.user)
            handleMenuClose()
          }}
          disabled={isOldest(menuAnchor?.user!)}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon><i className='ri-delete-bin-line' style={{ color: 'inherit' }} /></ListItemIcon>
          Eliminar usuario
        </MenuItem>
      </Menu>
    </>
  )
}
