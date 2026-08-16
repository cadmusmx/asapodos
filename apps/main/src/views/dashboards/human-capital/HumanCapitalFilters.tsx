'use client'

import Grid from '@mui/material/Grid2'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'

import FilterShell from '@views/dashboards/components/FilterShell'

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
    <FilterShell t={t} onClear={onClear} onSearch={onSearch} onReload={onReload}>
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
            <MenuItem value=''>{t('filters.all')}</MenuItem>
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
            <MenuItem value=''>{t('filters.all')}</MenuItem>
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
            <MenuItem value=''>{t('filters.all')}</MenuItem>
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
            <MenuItem value=''>{t('filters.all')}</MenuItem>
            {filters.regions.map((reg) => (
              <MenuItem key={reg.id} value={reg.id}>{reg.nombre}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
    </FilterShell>
  )
}

export default HumanCapitalFilters
