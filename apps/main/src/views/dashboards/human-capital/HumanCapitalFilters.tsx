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
  filters: {
    areas: Array<{ id: number; nombre: string }>
    departments: Array<{ id: number; nombre: string }>
    positions: Array<{ id: number; nombre: string }>
    regions: Array<{ id: number; nombre: string }>
  }
  values: {
    activo: string
    area: number | ''
    departamento: number | ''
    puesto: number | ''
    region: number | ''
  }
  onChange: (field: string, value: string | number) => void
  onSearch: () => void
  onClear: () => void
  onReload?: () => void
}

const HumanCapitalFilters = ({ t, filters, values, onChange, onSearch, onClear, onReload }: Props) => {
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

          <Grid size={{ xs: 12, md: 2.4 }}>
            <FormControl fullWidth size='small' sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}>
              <InputLabel>{t('dashboard.humanCapital.active')}</InputLabel>
              <Select
                value={values.activo}
                label={t('dashboard.humanCapital.active')}
                onChange={(e) => onChange('activo', e.target.value)}
              >
                <MenuItem value=''>{t('filters.all')}</MenuItem>
                <MenuItem value='A'>{t('dashboard.humanCapital.active')}</MenuItem>
                <MenuItem value='I'>{t('dashboard.humanCapital.inactive')}</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, md: 2.4 }}>
            <FormControl fullWidth size='small' sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}>
              <InputLabel>{t('dashboard.humanCapital.area')}</InputLabel>
              <Select
                value={values.area}
                label={t('dashboard.humanCapital.area')}
                onChange={(e) => onChange('area', e.target.value)}
              >
                <MenuItem value=''>{t('filters.select')}</MenuItem>
                {filters.areas.map((area) => (
                  <MenuItem key={area.id} value={area.id}>{area.nombre}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, md: 2.4 }}>
            <FormControl fullWidth size='small' sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}>
              <InputLabel>{t('dashboard.humanCapital.department')}</InputLabel>
              <Select
                value={values.departamento}
                label={t('dashboard.humanCapital.department')}
                onChange={(e) => onChange('departamento', e.target.value)}
              >
                <MenuItem value=''>{t('filters.select')}</MenuItem>
                {filters.departments.map((dept) => (
                  <MenuItem key={dept.id} value={dept.id}>{dept.nombre}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, md: 2.4 }}>
            <FormControl fullWidth size='small' sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}>
              <InputLabel>{t('dashboard.humanCapital.position')}</InputLabel>
              <Select
                value={values.puesto}
                label={t('dashboard.humanCapital.position')}
                onChange={(e) => onChange('puesto', e.target.value)}
              >
                <MenuItem value=''>{t('filters.select')}</MenuItem>
                {filters.positions.map((pos) => (
                  <MenuItem key={pos.id} value={pos.id}>{pos.nombre}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, md: 2.4 }}>
            <FormControl fullWidth size='small' sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}>
              <InputLabel>{t('dashboard.humanCapital.region')}</InputLabel>
              <Select
                value={values.region}
                label={t('dashboard.humanCapital.region')}
                onChange={(e) => onChange('region', e.target.value)}
              >
                <MenuItem value=''>{t('filters.select')}</MenuItem>
                {filters.regions.map((reg) => (
                  <MenuItem key={reg.id} value={reg.id}>{reg.nombre}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  )
}

export default HumanCapitalFilters
