'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Chip from '@mui/material/Chip'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import type { BillingRecord, BillingRecordStatus } from '@gaso/shared/types/plan'
import EmptyState from '@/components/shared/EmptyState'

const STATUS_CONFIG: Record<BillingRecordStatus, { color: 'default' | 'success' | 'error' | 'warning'; label: string }> = {
  PENDING: { color: 'warning', label: 'Pendiente' },
  PAID: { color: 'success', label: 'Pagado' },
  FAILED: { color: 'error', label: 'Fallido' },
  REFUNDED: { color: 'default', label: 'Reembolsado' }
}

interface TenantBillingTabProps {
  tenantId: string
  billingRecords: BillingRecord[]
}

export default function TenantBillingTab({ tenantId, billingRecords }: TenantBillingTabProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const formatDate = (date: Date | string | null) => {
    if (!date) return '-'
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  const handleMarkPaid = async (billingRecordId: string) => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}/billing`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billingRecordId, action: 'mark_paid' })
      })

      if (!res.ok) {
        const result = await res.json()
        throw new Error(result.message || 'Error al marcar como pagado')
      }

      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al marcar como pagado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant='h6'>Historial de Facturación</Typography>
            </Box>

            {error && <Alert severity='error' sx={{ mb: 2 }}>{error}</Alert>}

            {billingRecords.length === 0 ? (
              <EmptyState
                icon='ri-file-list-line'
                title='No hay registros de facturación'
                description='Los invoices aparecerán aquí cuando se creen'
              />
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Fecha</TableCell>
                      <TableCell>Periodo</TableCell>
                      <TableCell>Monto</TableCell>
                      <TableCell>Estado</TableCell>
                      <TableCell>Pagado el</TableCell>
                      <TableCell align='right'>Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {billingRecords.map(record => {
                      const statusCfg = STATUS_CONFIG[record.status] ?? { color: 'default', label: record.status }
                      return (
                        <TableRow key={record.billingRecordId} hover>
                          <TableCell>{formatDate(record.createdAt)}</TableCell>
                          <TableCell>
                            {record.periodStart && record.periodEnd
                              ? `${formatDate(record.periodStart)} - ${formatDate(record.periodEnd)}`
                              : '-'}
                          </TableCell>
                          <TableCell>
                            <Typography fontWeight='bold' color='success.main'>
                              {record.currency} {record.amount.toFixed(2)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip label={statusCfg.label} color={statusCfg.color} size='small' variant='outlined' />
                          </TableCell>
                          <TableCell>{record.paidAt ? formatDate(record.paidAt) : '-'}</TableCell>
                          <TableCell align='right'>
                            {record.status === 'PENDING' && (
                              <Button
                                size='small'
                                variant='outlined'
                                onClick={() => handleMarkPaid(record.billingRecordId)}
                                disabled={loading}
                              >
                                {loading ? <CircularProgress size={16} /> : 'Marcar Pagado'}
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}
