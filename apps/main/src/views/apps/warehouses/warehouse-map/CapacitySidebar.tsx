'use client'

import { useMemo } from 'react'

import Box from '@mui/material/Box'
import Accordion from '@mui/material/Accordion'
import AccordionSummary from '@mui/material/AccordionSummary'
import AccordionDetails from '@mui/material/AccordionDetails'
import Typography from '@mui/material/Typography'
import LinearProgress from '@mui/material/LinearProgress'
import Link from '@mui/material/Link'
import Skeleton from '@mui/material/Skeleton'
import Grid from '@mui/material/Grid2'

import type { WarehouseCapacity } from '@/types/warehouse-map'
import { esEricsson, getCapacityColor } from './warehouse-map-utils'

type Props = {
  capacities: WarehouseCapacity[]
  isLoading: boolean
  onWarehouseClick: (nombre: string) => void
  t: (key: string) => string
}

const CapacitySidebar = ({ capacities, isLoading, onWarehouseClick, t }: Props) => {
  const { gasoCapacities, ericssonCapacities } = useMemo(() => {
    const gaso: WarehouseCapacity[] = []
    const ericsson: WarehouseCapacity[] = []
    capacities.forEach(c => {
      if (esEricsson(c.Almacen)) {
        ericsson.push(c)
      } else {
        gaso.push(c)
      }
    })
    const sortByOccupancy = (arr: WarehouseCapacity[]) =>
      [...arr].sort((a, b) => {
        const pctA = a.Capacidad && a.Capacidad > 0 ? (a.Capacidad_Ocupada ?? 0) / a.Capacidad : 0
        const pctB = b.Capacidad && b.Capacidad > 0 ? (b.Capacidad_Ocupada ?? 0) / b.Capacidad : 0
        return pctB - pctA
      })
    return {
      gasoCapacities: sortByOccupancy(gaso),
      ericssonCapacities: sortByOccupancy(ericsson)
    }
  }, [capacities])

  const renderCapacityBar = (item: WarehouseCapacity) => {
    const pct = item.Capacidad && item.Capacidad > 0
      ? Math.round(((item.Capacidad_Ocupada ?? 0) / item.Capacidad) * 100)
      : 0
    const color = getCapacityColor(pct)
    const isAlert = pct >= 100

    return (
      <Box
        key={item.Almacen}
        sx={{
          mb: 1.5,
          cursor: 'pointer',
          '&:hover .bar-inner': isAlert ? {} : { filter: 'brightness(1.1)' }
        }}
        onClick={() => onWarehouseClick(item.Almacen)}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
          <Typography variant='body2' sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {isAlert && (
              <Box
                component='i'
                className='ri-error-warning-fill'
                sx={{ color: 'error.main', fontSize: 14, animation: 'pulseMarker 1.5s infinite ease-in-out' }}
              />
            )}
            {item.Almacen}
          </Typography>
          <Link
            href={`https://www.google.com/maps/search/${encodeURIComponent(item.Almacen)}`}
            target='_blank'
            rel='noopener'
            onClick={e => e.stopPropagation()}
            sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary', '&:hover': { color: 'info.main' } }}
          >
            <Box component='i' className='ri-video-line' sx={{ fontSize: 14 }} />
          </Link>
        </Box>
        <Box sx={{ position: 'relative' }}>
          <LinearProgress
            variant='determinate'
            value={Math.min(pct, 100)}
            color={color}
            sx={{
              height: 20,
              borderRadius: '10px',
              bgcolor: 'grey.200',
              '& .bar-inner': {
                borderRadius: '10px',
                transition: 'width 0.3s ease-in-out',
                ...(isAlert && {
                  animation: 'pulseBar 1.5s infinite ease-in-out'
                })
              }
            }}
          />
          <Typography
            variant='caption'
            sx={{
              position: 'absolute',
              right: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#fff',
              fontWeight: 600,
              fontSize: '0.7rem',
              textShadow: '0 1px 2px rgba(0,0,0,0.3)'
            }}
          >
            {pct}%
          </Typography>
        </Box>
      </Box>
    )
  }

  const renderLoadingSkeleton = () => (
    <Box sx={{ px: 1 }}>
      {[1, 2, 3].map(i => (
        <Box key={i} sx={{ mb: 2 }}>
          <Skeleton variant='text' width='60%' sx={{ mb: 0.5 }} />
          <Skeleton variant='rectangular' height={20} sx={{ borderRadius: '10px' }} />
        </Box>
      ))}
    </Box>
  )

  return (
    <Box
      sx={{
        width: 320,
        height: '100%',
        bgcolor: 'background.paper',
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography variant='h6' sx={{ fontWeight: 700, textAlign: 'center' }}>
          {t('navigation.warehouses.warehouseMap.capacitySidebar')}
        </Typography>
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
        <Accordion defaultExpanded disableGutters elevation={0} sx={{ '&:before': { display: 'none' } }}>
          <AccordionSummary sx={{ px: 1, minHeight: 44 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box component='i' className='ri-store-2-line' sx={{ color: 'primary.main' }} />
              <Typography variant='subtitle2'>{t('navigation.warehouses.warehouseMap.gasoWarehouses')}</Typography>
              <Box
                component='span'
                sx={{
                  bgcolor: 'primary.main',
                  color: 'white',
                  borderRadius: '10px',
                  px: 1,
                  py: 0.25,
                  fontSize: '0.75rem',
                  fontWeight: 700
                }}
              >
                {gasoCapacities.length}
              </Box>
            </Box>
          </AccordionSummary>
          <AccordionDetails sx={{ px: 1 }}>
            {isLoading ? renderLoadingSkeleton() : gasoCapacities.length === 0 ? (
              <Typography variant='caption' color='text.secondary'>
                {t('navigation.warehouses.warehouseMap.noCapacityData')}
              </Typography>
            ) : (
              gasoCapacities.map(renderCapacityBar)
            )}
          </AccordionDetails>
        </Accordion>

        <Accordion disableGutters elevation={0} sx={{ '&:before': { display: 'none' }, mt: 1 }}>
          <AccordionSummary sx={{ px: 1, minHeight: 44 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box component='i' className='ri-map-pin-fill' sx={{ color: 'error.main' }} />
              <Typography variant='subtitle2'>{t('navigation.warehouses.warehouseMap.ericssonWarehouses')}</Typography>
              <Box
                component='span'
                sx={{
                  bgcolor: 'error.main',
                  color: 'white',
                  borderRadius: '10px',
                  px: 1,
                  py: 0.25,
                  fontSize: '0.75rem',
                  fontWeight: 700
                }}
              >
                {ericssonCapacities.length}
              </Box>
            </Box>
          </AccordionSummary>
          <AccordionDetails sx={{ px: 1 }}>
            {isLoading ? renderLoadingSkeleton() : ericssonCapacities.length === 0 ? (
              <Typography variant='caption' color='text.secondary'>
                {t('navigation.warehouses.warehouseMap.noCapacityData')}
              </Typography>
            ) : (
              ericssonCapacities.map(renderCapacityBar)
            )}
          </AccordionDetails>
        </Accordion>
      </Box>
    </Box>
  )
}

export default CapacitySidebar
