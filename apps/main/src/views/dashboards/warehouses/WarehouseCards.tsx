'use client'

/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable padding-line-between-statements */
/* eslint-disable newline-before-return */

import Grid from '@mui/material/Grid2'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import LinearProgress from '@mui/material/LinearProgress'

type WarehouseItem = {
  id: number
  almacen: string
  region: string
  ciudad: string
  capacidad: number
  estadoAlmacen: string
  responsable: string
  capacidadOcupada: number
}

type Props = {
  t: (key: string) => string
  data: WarehouseItem[]
}

const getNivelColor = (porcentaje: number): 'success' | 'info' | 'warning' | 'error' => {
  if (porcentaje >= 90) return 'error'
  if (porcentaje >= 80) return 'warning'
  if (porcentaje >= 65) return 'info'
  return 'success'
}

const WarehouseCards = ({ t, data }: Props) => {
  const getNivel = (porcentaje: number): string => {
    if (porcentaje >= 90) return 'CRITICO'
    if (porcentaje >= 80) return 'ALTO'
    if (porcentaje >= 65) return 'MEDIO'
    return 'NORMAL'
  }

  return (
    <Grid container spacing={3}>
      {data.map(warehouse => {
        const porcentaje =
          warehouse.capacidad > 0 ? Math.round((warehouse.capacidadOcupada / warehouse.capacidad) * 100) : 0
        const nivel = getNivel(porcentaje)
        const nivelColor = getNivelColor(porcentaje)

        return (
          <Grid size={{ xs: 12, md: 6, lg: 4 }} key={warehouse.id}>
            <div className='border rounded p-4'>
              <div className='flex items-center justify-between mb-2'>
                <Typography variant='h6'>{warehouse.almacen}</Typography>
                <Chip
                  label={
                    warehouse.estadoAlmacen === 'Operativo'
                      ? t('dashboard.warehouses.operational')
                      : warehouse.estadoAlmacen
                  }
                  color={warehouse.estadoAlmacen === 'Operativo' ? 'success' : 'default'}
                  size='small'
                />
              </div>
              <Typography variant='body2' color='text.secondary' className='mb-2'>
                {warehouse.region} / {warehouse.ciudad}
              </Typography>
              <div className='mb-2'>
                <div className='flex justify-between mb-1'>
                  <Typography variant='body2'>
                    {t('dashboard.warehouses.occupancy')}: {porcentaje}%
                  </Typography>
                  <Chip label={nivel} color={nivelColor} size='small' sx={{ height: 20 }} />
                </div>
                <LinearProgress
                  variant='determinate'
                  value={porcentaje}
                  color={nivelColor}
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </div>
              <div className='flex justify-between'>
                <Typography variant='body2' color='text.secondary'>
                  {t('dashboard.warehouses.capacity')}: {warehouse.capacidad}m²
                </Typography>
                <Typography variant='body2' color='text.secondary'>
                  {t('dashboard.warehouses.occupied')}: {warehouse.capacidadOcupada}m²
                </Typography>
              </div>
              {warehouse.responsable && (
                <Typography variant='body2' color='text.secondary' className='mt-2'>
                  {t('dashboard.warehouses.responsible')}: {warehouse.responsable}
                </Typography>
              )}
            </div>
          </Grid>
        )
      })}
    </Grid>
  )
}

export default WarehouseCards
