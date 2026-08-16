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
    year: string
    region: string
  }
  onChange: (field: string, value: string) => void
  onSearch: () => void
  onClear: () => void
  onReload?: () => void
  regions?: Array<{ id: number; nombre: string }>
}

const GeneralFilters = ({ t, values, onChange, onSearch, onClear, onReload, regions = [] }: Props) => {
  return (
    <FilterShell t={t} onClear={onClear} onSearch={onSearch} onReload={onReload}>
      <Grid size={{ xs: 12, md: 4 }}>
        <FormControl fullWidth size='small' sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}>
          <InputLabel>{t('dashboard.general.year')}</InputLabel>
          <Select
            value={values.year}
            label={t('dashboard.general.year')}
            onChange={(e) => onChange('year', e.target.value)}
          >
            <MenuItem value=''>{t('filters.all')}</MenuItem>
            <MenuItem value='2024'>2024</MenuItem>
            <MenuItem value='2025'>2025</MenuItem>
            <MenuItem value='2026'>2026</MenuItem>
          </Select>
        </FormControl>
      </Grid>

      <Grid size={{ xs: 12, md: 4 }}>
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
    </FilterShell>
  )
}

export default GeneralFilters
