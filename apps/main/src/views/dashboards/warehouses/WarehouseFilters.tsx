'use client'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid2'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'

type Props = {
  t: (key: string) => string
  values: {
    region: string
    ciudad: string
    estado: string
    nivelOcupacion: string
  }
  onChange: (field: string, value: string) => void
  onSearch: () => void
  onClear?: () => void
  regions?: string[]
  cities?: string[]
}

const WarehouseFilters = ({ t, values, onChange, onSearch, onClear, regions = [], cities = [] }: Props) => {
  return (
    <Card
      sx={{
        borderRadius: '16px',
        border: '1px solid',
        borderColor: 'divider',
        boxShadow: 'none',
        background: 'linear-gradient(180deg, #fafbfc 0%, #fff 100%)',
        mb: 3
      }}
    >
      <CardContent sx={{ p: '16px 20px !important' }}>
        <Grid container spacing={2} alignItems='center'>
          <Grid size={{ xs: 12 }} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button
              variant='outlined'
              onClick={() => {
                onChange('region', '')
                onChange('ciudad', '')
                onChange('estado', '')
                onChange('nivelOcupacion', '')
              }}
              sx={{
                borderRadius: '10px',
                minWidth: 40,
                width: 40,
                height: 40,
                p: 0,
                borderColor: 'divider',
                color: 'text.secondary',
                '&:hover': {
                  borderColor: 'primary.main',
                  background: 'primary.main +08',
                  color: 'primary.main'
                }
              }}
            >
              <i className='ri-close-circle-line' style={{ fontSize: '1.1rem' }} />
            </Button>
            <Button
              variant='contained'
              onClick={onSearch}
              sx={{
                borderRadius: '10px',
                minWidth: 40,
                width: 40,
                height: 40,
                p: 0,
                background: 'linear-gradient(135deg, #0d6efd, #0056b3)',
                boxShadow: '0 2px 8px rgba(13,110,253,0.3)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #0056b3, #003d80)',
                  boxShadow: '0 4px 12px rgba(13,110,253,0.4)'
                }
              }}
            >
              <i className='ri-search-line' style={{ fontSize: '1.1rem' }} />
            </Button>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #0d6efd22, #0d6efd11)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                ml: 1
              }}
            >
              <i className='ri-filter-3-line' style={{ fontSize: '1rem', color: '#0d6efd' }} />
            </Box>
            <Box component='span' sx={{ fontSize: '0.8rem', fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.8 }}>
              {t('filters.filters')}
            </Box>
          </Grid>

          <Grid size={{ xs: 12, md: 3 }}>
            <FormControl fullWidth size='small' sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}>
              <InputLabel>{t('filters.region')}</InputLabel>
              <Select
                value={values.region}
                label={t('filters.region')}
                onChange={(e) => onChange('region', e.target.value)}
              >
                <MenuItem value=''>{t('filters.all')}</MenuItem>
                {regions.map((reg) => (
                  <MenuItem key={reg} value={reg}>{reg}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, md: 3 }}>
            <FormControl fullWidth size='small' sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}>
              <InputLabel>{t('dashboard.warehouses.city')}</InputLabel>
              <Select
                value={values.ciudad}
                label={t('dashboard.warehouses.city')}
                onChange={(e) => onChange('ciudad', e.target.value)}
              >
                <MenuItem value=''>{t('filters.all')}</MenuItem>
                {cities.map((city) => (
                  <MenuItem key={city} value={city}>{city}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, md: 2 }}>
            <FormControl fullWidth size='small' sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}>
              <InputLabel>{t('dashboard.warehouses.status')}</InputLabel>
              <Select
                value={values.estado}
                label={t('dashboard.warehouses.status')}
                onChange={(e) => onChange('estado', e.target.value)}
              >
                <MenuItem value=''>{t('filters.all')}</MenuItem>
                <MenuItem value='Operativo'>{t('dashboard.warehouses.operational')}</MenuItem>
                <MenuItem value='Inactivo'>{t('dashboard.warehouses.inactive')}</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, md: 2 }}>
            <FormControl fullWidth size='small' sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}>
              <InputLabel>{t('filters.occupancyLevel')}</InputLabel>
              <Select
                value={values.nivelOcupacion}
                label={t('filters.occupancyLevel')}
                onChange={(e) => onChange('nivelOcupacion', e.target.value)}
              >
                <MenuItem value=''>{t('filters.all')}</MenuItem>
                <MenuItem value='NORMAL'>{t('dashboard.warehouses.normal')}</MenuItem>
                <MenuItem value='MEDIO'>{t('dashboard.warehouses.medium')}</MenuItem>
                <MenuItem value='ALTO'>{t('dashboard.warehouses.high')}</MenuItem>
                <MenuItem value='CRITICO'>{t('dashboard.warehouses.critical')}</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  )
}

export default WarehouseFilters
