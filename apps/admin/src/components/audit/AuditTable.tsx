'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TablePagination from '@mui/material/TablePagination'
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import { AUDIT_ACTION_LABELS, type AuditActionCode } from '@gaso/shared'
import type { AuditEntryWithTenantName } from '@/services/audit-service'

interface AuditTableProps {
  entries: AuditEntryWithTenantName[]
  total: number
  page: number
  pageSize: number
  tenantId: string | null
  tableName: string | null
  action: string | null
  appUser: string | null
  startDate: string | null
  endDate: string | null
}

const actionColors: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
  TEN_CR: 'success',
  TEN_UP: 'info',
  TEN_ACT: 'success',
  TEN_SUSP: 'warning',
  TEN_DEA: 'error'
}

function buildUrl(params: {
  page: number
  pageSize: number
  tenantId: string | null
  tableName: string | null
  action: string | null
  appUser: string | null
  startDate: string | null
  endDate: string | null
}) {
  const p = new URLSearchParams()
  p.set('page', String(params.page))
  p.set('pageSize', String(params.pageSize))
  if (params.tenantId) p.set('tenantId', params.tenantId)
  if (params.tableName) p.set('tableName', params.tableName)
  if (params.action) p.set('action', params.action)
  if (params.appUser) p.set('appUser', params.appUser)
  if (params.startDate) p.set('startDate', params.startDate)
  if (params.endDate) p.set('endDate', params.endDate)
  return `/admin/audit?${p.toString()}`
}

function formatDate(date: Date | string | null | undefined) {
  if (!date) return '-'
  return new Date(date).toLocaleString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function safeJsonParse(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'string' || !value) return null
  try {
    return JSON.parse(value) as Record<string, unknown>
  } catch {
    return null
  }
}

function getActionLabel(action: string): string {
  return AUDIT_ACTION_LABELS[action as AuditActionCode] || action
}

export default function AuditTable({
  entries,
  total,
  page,
  pageSize,
  tenantId,
  tableName,
  action,
  appUser,
  startDate,
  endDate
}: AuditTableProps) {
  const router = useRouter()
  const baseParams = { tenantId, tableName, action, appUser, startDate, endDate }
  const [selectedEntry, setSelectedEntry] = useState<AuditEntryWithTenantName | null>(null)

  const handlePageChange = (_: unknown, newPage: number) => {
    router.push(buildUrl({ ...baseParams, page: newPage + 1, pageSize }))
  }

  const handleRowsPerPageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    router.push(buildUrl({ ...baseParams, page: 1, pageSize: Number(e.target.value) }))
  }

  const oldData = selectedEntry ? safeJsonParse(selectedEntry.oldData) : null
  const newData = selectedEntry ? safeJsonParse(selectedEntry.newData) : null

  return (
    <>
      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer sx={{ maxHeight: 600 }}>
          <Table stickyHeader size='small'>
            <TableHead>
              <TableRow>
                <TableCell scope='col'>Fecha</TableCell>
                <TableCell scope='col'>Tenant</TableCell>
                <TableCell scope='col'>Usuario</TableCell>
                <TableCell scope='col'>Tabla</TableCell>
                <TableCell scope='col'>Acción</TableCell>
                <TableCell scope='col'>App User</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {entries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align='center' sx={{ py: 8, color: 'text.secondary' }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                      <i className='ri-file-list-line' style={{ fontSize: '2.5rem', opacity: 0.4 }} />
                      <Typography color='text.secondary'>No hay registros de auditoría</Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                entries.map((entry, index) => (
                  <TableRow
                    key={entry.changedAt ? String(entry.changedAt) : `row-${index}`}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => setSelectedEntry(entry)}
                  >
                    <TableCell>{formatDate(entry.changedAt)}</TableCell>
                    <TableCell>
                      <Typography variant='body2' fontWeight='medium'>
                        {entry.tenantName || '-'}
                      </Typography>
                      {entry.tenantId && (
                        <Typography variant='caption' color='text.secondary' sx={{ fontFamily: 'monospace' }}>
                          {entry.tenantId.substring(0, 8)}...
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>{entry.userId || '-'}</TableCell>
                    <TableCell>{entry.tableName}</TableCell>
                    <TableCell>
                      <Tooltip title={<span style={{ fontFamily: 'monospace' }}>{entry.action}</span>} arrow>
                        <span>
                          <Chip
                            label={getActionLabel(entry.action)}
                            color={actionColors[entry.action] || 'default'}
                            size='small'
                            variant='outlined'
                          />
                        </span>
                      </Tooltip>
                    </TableCell>
                    <TableCell>{entry.appUser || '-'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[25, 50, 100]}
          component='div'
          count={total}
          rowsPerPage={pageSize}
          page={page - 1}
          onPageChange={handlePageChange}
          onRowsPerPageChange={handleRowsPerPageChange}
          labelRowsPerPage='Filas por página:'
        />
      </Paper>

      <Drawer
        anchor='right'
        open={Boolean(selectedEntry)}
        onClose={() => setSelectedEntry(null)}
        PaperProps={{ sx: { width: { xs: '100%', sm: 480 }, p: 3 } }}
      >
        {selectedEntry && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant='h6' fontWeight='bold'>
                Detalle de Auditoría
              </Typography>
              <IconButton onClick={() => setSelectedEntry(null)} aria-label='Cerrar'>
                <i className='ri-close-line' />
              </IconButton>
            </Box>

            <Stack spacing={2} divider={<Divider />}>
              <Box>
                <Typography variant='body2' color='text.secondary'>Acción</Typography>
                <Chip
                  label={getActionLabel(selectedEntry.action)}
                  color={actionColors[selectedEntry.action] || 'default'}
                  size='small'
                  sx={{ mt: 0.5 }}
                />
                <Typography variant='caption' color='text.secondary' sx={{ ml: 1, fontFamily: 'monospace' }}>
                  {selectedEntry.action}
                </Typography>
              </Box>

              <Box>
                <Typography variant='body2' color='text.secondary'>Tenant</Typography>
                <Typography fontWeight='medium'>{selectedEntry.tenantName || '-'}</Typography>
                {selectedEntry.tenantId && (
                  <Typography variant='caption' color='text.secondary' sx={{ fontFamily: 'monospace' }}>
                    {selectedEntry.tenantId}
                  </Typography>
                )}
              </Box>

              <Box>
                <Typography variant='body2' color='text.secondary'>Usuario (ID)</Typography>
                <Typography>{selectedEntry.userId || '-'}</Typography>
              </Box>

              <Box>
                <Typography variant='body2' color='text.secondary'>App User</Typography>
                <Typography>{selectedEntry.appUser || '-'}</Typography>
              </Box>

              <Box>
                <Typography variant='body2' color='text.secondary'>Tabla</Typography>
                <Typography sx={{ fontFamily: 'monospace' }}>{selectedEntry.tableName}</Typography>
              </Box>

              <Box>
                <Typography variant='body2' color='text.secondary'>Fecha</Typography>
                <Typography>{formatDate(selectedEntry.changedAt)}</Typography>
              </Box>

              {(oldData || newData) && (
                <Box>
                  <Typography variant='body2' color='text.secondary' gutterBottom>Cambios</Typography>
                  <Box sx={{ bgcolor: 'action.hover', p: 2, borderRadius: 1, fontSize: '0.75rem', fontFamily: 'monospace' }}>
                    {oldData && (
                      <Box sx={{ mb: newData ? 1.5 : 0 }}>
                        <Typography variant='caption' color='error.main' fontWeight='bold'>Anterior:</Typography>
                        <pre style={{ margin: '4px 0 0', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                          {JSON.stringify(oldData, null, 2)}
                        </pre>
                      </Box>
                    )}
                    {newData && (
                      <Box>
                        <Typography variant='caption' color='success.main' fontWeight='bold'>Nuevo:</Typography>
                        <pre style={{ margin: '4px 0 0', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                          {JSON.stringify(newData, null, 2)}
                        </pre>
                      </Box>
                    )}
                  </Box>
                </Box>
              )}
            </Stack>
          </Box>
        )}
      </Drawer>
    </>
  )
}
