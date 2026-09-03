import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'

import {
  formatInventoryDateTime,
  formatInventoryQuantity,
  getInventoryStatusColor,
  getInventoryStatusLabel
} from '@/lib/inventory/presentation'

import type { InventoryStockListItem } from '@/types/inventory'

type InventoryTableProps = {
  rows: InventoryStockListItem[]
  loading: boolean
}

const getTrackingLabels = (item: InventoryStockListItem): string[] => {
  const labels: string[] = []

  if (item.sku.tracking.isSerialized) {
    labels.push('Serial')
  }

  if (item.sku.tracking.isLotTracked) {
    labels.push('Lote')
  }

  if (item.sku.tracking.isPalletTracked) {
    labels.push('Tarima')
  }

  if (item.sku.tracking.allowsReverseLogistics) {
    labels.push('Logística inversa')
  }

  return labels
}

const InventoryTable = ({ rows, loading }: InventoryTableProps) => {
  return (
    <TableContainer component={Paper} variant='outlined'>
      <Table size='small' sx={{ minWidth: 1250 }}>
        <TableHead>
          <TableRow>
            <TableCell>Artículo / SKU</TableCell>
            <TableCell>Almacén</TableCell>
            <TableCell>Clasificación</TableCell>
            <TableCell>Seguimiento</TableCell>
            <TableCell>Estado</TableCell>
            <TableCell align='right'>Existencia</TableCell>
            <TableCell align='right'>Reservado</TableCell>
            <TableCell align='right'>Disponible</TableCell>
            <TableCell>Actualización</TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={9}>
                <Stack alignItems='center' spacing={2} sx={{ py: 7 }}>
                  <CircularProgress />

                  <Typography variant='body2' color='text.secondary'>
                    Consultando inventario...
                  </Typography>
                </Stack>
              </TableCell>
            </TableRow>
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9}>
                <Stack alignItems='center' spacing={1} sx={{ py: 7 }}>
                  <i className='ri-inbox-archive-line text-4xl' />

                  <Typography fontWeight={600}>No hay inventario para mostrar</Typography>

                  <Typography variant='body2' color='text.secondary'>
                    Ajusta los filtros o registra existencias mediante movimientos de inventario.
                  </Typography>
                </Stack>
              </TableCell>
            </TableRow>
          ) : (
            rows.map(row => {
              const trackingLabels = getTrackingLabels(row)

              return (
                <TableRow key={row.inventoryStockId} hover>
                  <TableCell>
                    <Stack spacing={0.5}>
                      <Typography fontWeight={600}>{row.item.name}</Typography>

                      <Typography variant='body2'>{row.sku.code}</Typography>

                      <Typography variant='caption' color='text.secondary'>
                        {row.sku.manufacturerPartNumber
                          ? `No. fabricante: ${row.sku.manufacturerPartNumber}`
                          : 'Sin número de fabricante'}
                      </Typography>
                    </Stack>
                  </TableCell>

                  <TableCell>
                    <Stack spacing={0.5}>
                      <Typography variant='body2' fontWeight={600}>
                        {row.warehouse.name}
                      </Typography>

                      <Typography variant='caption' color='text.secondary'>
                        {row.warehouse.code}
                        {row.warehouse.region ? ` · ${row.warehouse.region}` : ''}
                      </Typography>
                    </Stack>
                  </TableCell>

                  <TableCell>
                    <Stack spacing={0.5}>
                      <Typography variant='body2'>{row.item.category ?? 'Sin categoría'}</Typography>

                      <Typography variant='caption' color='text.secondary'>
                        {row.item.manufacturer ?? 'Sin fabricante'}
                      </Typography>
                    </Stack>
                  </TableCell>

                  <TableCell>
                    {trackingLabels.length === 0 ? (
                      <Typography variant='caption' color='text.secondary'>
                        Sin seguimiento especial
                      </Typography>
                    ) : (
                      <Stack direction='row' spacing={1} useFlexGap flexWrap='wrap'>
                        {trackingLabels.map(label => (
                          <Chip key={label} label={label} size='small' variant='outlined' />
                        ))}
                      </Stack>
                    )}
                  </TableCell>

                  <TableCell>
                    <Chip
                      label={getInventoryStatusLabel(row.stock.status)}
                      color={getInventoryStatusColor(row.stock.status)}
                      size='small'
                    />
                  </TableCell>

                  <TableCell align='right'>{formatInventoryQuantity(row.stock.onHand)}</TableCell>

                  <TableCell align='right'>{formatInventoryQuantity(row.stock.reserved)}</TableCell>

                  <TableCell align='right'>
                    <Typography fontWeight={700}>{formatInventoryQuantity(row.stock.available)}</Typography>
                  </TableCell>

                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    <Typography variant='body2'>{formatInventoryDateTime(row.stock.updatedAt)}</Typography>

                    <Typography variant='caption' color='text.secondary'>
                      {row.sku.unitOfMeasure}
                    </Typography>
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

export default InventoryTable
