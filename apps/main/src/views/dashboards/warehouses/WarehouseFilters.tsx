'use client'

import Grid from '@mui/material/Grid2'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'

import FilterShell from '@views/dashboards/components/FilterShell'

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
  onReload?: () => void
  regions?: string[]
  cities?: string[]
}

const WarehouseFilters = ({ t, values, onChange, onSearch, onClear, onReload, regions = [], cities = [] }: Props) => {
  const handleClear = () => {
    onChange('region', '')
    onChange('ciudad', '')
    onChange('estado', '')
    onChange('nivelOcupacion', '')
    onClear?.() // parent increments searchKey to reload data
  }

  return (
    <FilterShell t={t} onClear={handleClear} onSearch={onSearch} onReload={onReload}>
      <Grid size={{ xs: 12, md: 3 }}>
        <FormControl fullWidth size='small' sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}>
          <InputLabel>{t('filters.region')}</InputLabel>
          <Select value={values.region} label={t('filters.region')} onChange={e => onChange('region', e.target.value)}>
            <MenuItem value=''>{t('filters.all')}</MenuItem>
            {regions.map(reg => (
              <MenuItem key={reg} value={reg}>
                {reg}
              </MenuItem>
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
            onChange={e => onChange('ciudad', e.target.value)}
          >
            <MenuItem value=''>{t('filters.all')}</MenuItem>
            {cities.map(city => (
              <MenuItem key={city} value={city}>
                {city}
              </MenuItem>
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
            onChange={e => onChange('estado', e.target.value)}
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
            onChange={e => onChange('nivelOcupacion', e.target.value)}
          >
            <MenuItem value=''>{t('filters.all')}</MenuItem>
            <MenuItem value='NORMAL'>{t('dashboard.warehouses.normal')}</MenuItem>
            <MenuItem value='MEDIO'>{t('dashboard.warehouses.medium')}</MenuItem>
            <MenuItem value='ALTO'>{t('dashboard.warehouses.high')}</MenuItem>
            <MenuItem value='CRITICO'>{t('dashboard.warehouses.critical')}</MenuItem>
          </Select>
        </FormControl>
      </Grid>
    </FilterShell>
  )
}

export default WarehouseFilters
