'use client'

import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'

type TableData = { key: string; count: number; monto: number }

type Props = {
  t: (key: string) => string
  title: string
  data: TableData[]
  height?: number
}

const formatMXN = (value: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value)

const FleetTable = ({ t, title, data, height = 260 }: Props) => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Typography variant='subtitle2' sx={{ fontWeight: 700, color: 'var(--mui-palette-text-primary)', mb: 1, px: 0.5 }}>
        {title}
      </Typography>
      <TableContainer component={Paper} elevation={0} sx={{ flexGrow: 1, borderRadius: 2, border: '1px solid var(--mui-palette-divider)', maxHeight: height }}>
        <Table stickyHeader size='small'>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'var(--mui-palette-text-disabled)', background: 'var(--mui-palette-background-paper)', py: 1 }}>
                {t('dashboard.fleets.tableKey')}
              </TableCell>
              <TableCell align='center' sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'var(--mui-palette-text-disabled)', background: 'var(--mui-palette-background-paper)', py: 1 }}>
                {t('dashboard.fleets.tableCount')}
              </TableCell>
              <TableCell align='right' sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'var(--mui-palette-text-disabled)', background: 'var(--mui-palette-background-paper)', py: 1 }}>
                {t('dashboard.fleets.tableMonto')}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} align='center' sx={{ py: 4, color: 'var(--mui-palette-text-disabled)' }}>
                  {t('dashboard.fleets.noData')}
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, idx) => (
                <TableRow key={idx} sx={{ '&:last-child td': { border: 0 } }}>
                  <TableCell sx={{ fontSize: '0.8rem', py: 1, color: 'var(--mui-palette-text-primary)' }}>
                    {row.key}
                  </TableCell>
                  <TableCell align='center' sx={{ fontSize: '0.8rem', py: 1 }}>
                    {row.count}
                  </TableCell>
                  <TableCell align='right' sx={{ fontSize: '0.8rem', fontWeight: 600, py: 1, color: 'var(--mui-palette-text-primary)' }}>
                    {formatMXN(row.monto)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
}

export default FleetTable
