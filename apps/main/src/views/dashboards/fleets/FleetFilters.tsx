'use client'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid2'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Box from '@mui/material/Box'

type Props = {
  t: (key: string) => string
  values: {
    fechaInicio: string
    fechaFin: string
    estatus: string
    region: string
    vehicleType: string
  }
  onChange: (field: string, value: string) => void
  onSearch: () => void
  onClear: () => void
  onReload?: () => void
  regions?: Array<{ id: number; nombre: string }>
  vehicleTypes?: Array<{ id: number; nombre: string }>
}

const FleetFilters = ({ t, values, onChange, onSearch, onClear, onReload, regions = [], vehicleTypes = [] }: Props) => {
  return (
    <Card
      sx={{
        borderRadius: '16px',
        border: '1px solid',
        borderColor: 'divider',
        boxShadow: 'none',
        background: 'var(--mui-palette-background-paper)',
        mb: 3
      }}
    >
      <CardContent sx={{ p: '16px 20px !important' }}>
        <Grid container spacing={2} alignItems='center'>
          <Grid size={{ xs: 12 }} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button
              variant='outlined'
              onClick={onClear}
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
                background: 'linear-gradient(135deg, var(--mui-palette-primary-main), var(--mui-palette-primary-dark))',
                boxShadow: '0 2px 8px rgba(var(--mui-palette-primary-mainChannel) / 0.3)',
                '&:hover': {
                  background: 'linear-gradient(135deg, var(--mui-palette-primary-dark), var(--mui-palette-primary-dark))',
                  boxShadow: '0 4px 12px rgba(var(--mui-palette-primary-mainChannel) / 0.4)'
                }
              }}
            >
              <i className='ri-search-line' style={{ fontSize: '1.1rem' }} />
            </Button>
            {onReload && (
              <Button
                variant='outlined'
                onClick={onReload}
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
                <i className='ri-refresh-line' style={{ fontSize: '1.1rem' }} />
              </Button>
            )}
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: '8px',
                background: 'linear-gradient(135deg, rgba(var(--mui-palette-primary-mainChannel) / 0.13), rgba(var(--mui-palette-primary-mainChannel) / 0.07))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                ml: 1
              }}
            >
              <i className='ri-filter-3-line' style={{ fontSize: '1rem', color: 'var(--mui-palette-primary-main)' }} />
            </Box>
            <Box component='span' sx={{ fontSize: '0.8rem', fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.8 }}>
              {t('filters.filters')}
            </Box>
          </Grid>

          <Grid size={{ xs: 12, md: 2 }}>
            <TextField
              fullWidth
              size='small'
              type='date'
              label={t('filters.dateStart')}
              InputLabelProps={{ shrink: true }}
              value={values.fechaInicio}
              onChange={(e) => onChange('fechaInicio', e.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 2 }}>
            <TextField
              fullWidth
              size='small'
              type='date'
              label={t('filters.dateEnd')}
              InputLabelProps={{ shrink: true }}
              value={values.fechaFin}
              onChange={(e) => onChange('fechaFin', e.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 2.4 }}>
            <FormControl fullWidth size='small' sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}>
              <InputLabel>{t('filters.status')}</InputLabel>
              <Select
                value={values.estatus}
                label={t('filters.status')}
                onChange={(e) => onChange('estatus', e.target.value)}
              >
                <MenuItem value=''>{t('filters.all')}</MenuItem>
                <MenuItem value='1'>{t('dashboard.expenses.accepted')}</MenuItem>
                <MenuItem value='2'>{t('dashboard.expenses.rejected')}</MenuItem>
                <MenuItem value='3'>{t('dashboard.expenses.pending')}</MenuItem>
                <MenuItem value='4'>{t('dashboard.expenses.paid')}</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, md: 2.4 }}>
            <FormControl fullWidth size='small' sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}>
              <InputLabel>{t('filters.region')}</InputLabel>
              <Select
                value={values.region}
                label={t('filters.region')}
                onChange={(e) => onChange('region', e.target.value)}
              >
                <MenuItem value=''>{t('filters.all')}</MenuItem>
                {regions.map((reg) => (
                  <MenuItem key={reg.id} value={reg.id}>{reg.nombre}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, md: 2.4 }}>
            <FormControl fullWidth size='small' sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}>
              <InputLabel>{t('dashboard.fleets.vehicleType')}</InputLabel>
              <Select
                value={values.vehicleType}
                label={t('dashboard.fleets.vehicleType')}
                onChange={(e) => onChange('vehicleType', e.target.value)}
              >
                <MenuItem value=''>{t('filters.all')}</MenuItem>
                {vehicleTypes.map((vt) => (
                  <MenuItem key={vt.id} value={vt.id}>{vt.nombre}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  )
}

export default FleetFilters
