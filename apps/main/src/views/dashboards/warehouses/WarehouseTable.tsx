'use client'

/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable padding-line-between-statements */
/* eslint-disable newline-before-return */
/* eslint-disable import/order */

import { useState } from 'react'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TableSortLabel from '@mui/material/TableSortLabel'
import Chip from '@mui/material/Chip'
import LinearProgress from '@mui/material/LinearProgress'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'

import OptionsMenu from '@core/components/option-menu'

type WarehouseItem = {
  id: number
  almacen: string
  region: string
  ciudad: string
  capacidad: number
  estadoAlmacen: string
  responsable: string
  coordinador: string
  capacidadOcupada: number
}

type Props = {
  t: (key: string) => string
  data: WarehouseItem[]
}

type Order = 'asc' | 'desc'

const WarehouseTable = ({ t, data }: Props) => {
  const [orderBy, setOrderBy] = useState<keyof WarehouseItem>('almacen')
  const [order, setOrder] = useState<Order>('asc')

  const handleSort = (property: keyof WarehouseItem) => {
    const isAsc = orderBy === property && order === 'asc'
    setOrder(isAsc ? 'desc' : 'asc')
    setOrderBy(property)
  }

  const sortedData = [...data].sort((a, b) => {
    const aValue = a[orderBy]
    const bValue = b[orderBy]
    if (aValue === bValue) return 0
    const comparison = aValue < bValue ? -1 : 1
    return order === 'asc' ? comparison : -comparison
  })

  const getNivelColor = (porcentaje: number): 'success' | 'info' | 'warning' | 'error' => {
    if (porcentaje >= 90) return 'error'
    if (porcentaje >= 80) return 'warning'
    if (porcentaje >= 65) return 'info'
    return 'success'
  }

  const getNivel = (porcentaje: number): string => {
    if (porcentaje >= 90) return 'CRITICO'
    if (porcentaje >= 80) return 'ALTO'
    if (porcentaje >= 65) return 'MEDIO'
    return 'NORMAL'
  }

  const handleExport = () => {
    const headers = [
      t('dashboard.warehouses.warehouse'),
      t('dashboard.warehouses.region'),
      t('dashboard.warehouses.city'),
      t('dashboard.warehouses.status'),
      t('dashboard.warehouses.capacity'),
      t('dashboard.warehouses.occupied'),
      t('dashboard.warehouses.available'),
      t('dashboard.warehouses.occupancy'),
      t('dashboard.warehouses.level')
    ]

    const rows = sortedData.map(w => {
      const pct = w.capacidad > 0 ? Math.round((w.capacidadOcupada / w.capacidad) * 100) : 0
      return [
        w.almacen,
        w.region,
        w.ciudad,
        w.estadoAlmacen,
        w.capacidad.toString(),
        w.capacidadOcupada.toString(),
        (w.capacidad - w.capacidadOcupada).toString(),
        `${pct}%`,
        getNivel(pct)
      ]
    })

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `warehouses_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Card>
      <CardHeader
        title={t('dashboard.warehouses.warehouse')}
        action={
          <div className='flex gap-2'>
            <Button
              variant='contained'
              size='small'
              onClick={handleExport}
              startIcon={<i className='ri-file-excel-line' />}
            >
              {t('dashboard.warehouses.exportExcel')}
            </Button>
          </div>
        }
      />
      <CardContent className='!p-0'>
        <TableContainer sx={{ maxHeight: 500 }}>
          <Table stickyHeader size='small'>
            <TableHead>
              <TableRow>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'almacen'}
                    direction={orderBy === 'almacen' ? order : 'asc'}
                    onClick={() => handleSort('almacen')}
                  >
                    {t('dashboard.warehouses.warehouse')}
                  </TableSortLabel>
                </TableCell>
                <TableCell>{t('dashboard.warehouses.region')}</TableCell>
                <TableCell>{t('dashboard.warehouses.city')}</TableCell>
                <TableCell>{t('dashboard.warehouses.status')}</TableCell>
                <TableCell align='right'>{t('dashboard.warehouses.capacity')}</TableCell>
                <TableCell align='right'>{t('dashboard.warehouses.occupied')}</TableCell>
                <TableCell align='right'>{t('dashboard.warehouses.available')}</TableCell>
                <TableCell>{t('dashboard.warehouses.occupancy')}</TableCell>
                <TableCell>{t('dashboard.warehouses.level')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedData.map(row => {
                const pct = row.capacidad > 0 ? Math.round((row.capacidadOcupada / row.capacidad) * 100) : 0
                const nivel = getNivel(pct)
                const nivelColor = getNivelColor(pct)

                return (
                  <TableRow key={row.id} hover>
                    <TableCell>{row.almacen}</TableCell>
                    <TableCell>{row.region}</TableCell>
                    <TableCell>{row.ciudad}</TableCell>
                    <TableCell>
                      <Chip
                        label={
                          row.estadoAlmacen === 'Operativo' ? t('dashboard.warehouses.operational') : row.estadoAlmacen
                        }
                        color={row.estadoAlmacen === 'Operativo' ? 'success' : 'default'}
                        size='small'
                      />
                    </TableCell>
                    <TableCell align='right'>{row.capacidad}</TableCell>
                    <TableCell align='right'>{row.capacidadOcupada}</TableCell>
                    <TableCell align='right'>{row.capacidad - row.capacidadOcupada}</TableCell>
                    <TableCell sx={{ minWidth: 150 }}>
                      <div className='flex items-center gap-2'>
                        <LinearProgress
                          variant='determinate'
                          value={pct}
                          color={nivelColor}
                          sx={{ flexGrow: 1, height: 6, borderRadius: 4 }}
                        />
                        <Typography variant='body2'>{pct}%</Typography>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Chip label={nivel} color={nivelColor} size='small' />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  )
}

export default WarehouseTable
