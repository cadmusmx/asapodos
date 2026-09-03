'use client'

import Grid from '@mui/material/Grid2'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'

import FilterShell from '@views/dashboards/components/FilterShell'

type Props = {
  t: (key: string) => string
  values: {
    fechaInicio: string
    fechaFin: string
    cliente: string
    estatus: string
    region: string
    departamento: string
    responsable: string
  }
  onChange: (field: string, value: string) => void
  onSearch: () => void
  onClear: () => void
  onReload?: () => void
  catalogs: {
    clients: Array<{ id: number; nombre: string }>
    regions: Array<{ id: number; nombre: string }>
    departments: Array<{ id: number; nombre: string }>
    employees: Array<{ id: number; nombre: string }>
  }
}

const ProjectFilters = ({ t, values, onChange, onSearch, onClear, onReload, catalogs }: Props) => {
  return (
    <FilterShell t={t} onClear={onClear} onSearch={onSearch} onReload={onReload}>
      <Grid size={{ xs: 12, md: 2 }}>
        <TextField
          fullWidth
          size='small'
          type='date'
          label={t('filters.dateStart')}
          InputLabelProps={{ shrink: true }}
          value={values.fechaInicio}
          onChange={e => onChange('fechaInicio', e.target.value)}
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
          onChange={e => onChange('fechaFin', e.target.value)}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
        />
      </Grid>

      <Grid size={{ xs: 12, md: 2 }}>
        <FormControl fullWidth size='small' sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}>
          <InputLabel>{t('filters.status')}</InputLabel>
          <Select
            value={values.estatus}
            label={t('filters.status')}
            onChange={e => onChange('estatus', e.target.value)}
          >
            <MenuItem value=''>{t('filters.all')}</MenuItem>
            <MenuItem value='1'>{t('dashboard.projects.active')}</MenuItem>
            <MenuItem value='0'>{t('dashboard.projects.inactive')}</MenuItem>
          </Select>
        </FormControl>
      </Grid>

      <Grid size={{ xs: 12, md: 2.4 }}>
        <FormControl fullWidth size='small' sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}>
          <InputLabel>{t('filters.region')}</InputLabel>
          <Select value={values.region} label={t('filters.region')} onChange={e => onChange('region', e.target.value)}>
            <MenuItem value=''>{t('filters.all')}</MenuItem>
            {catalogs.regions.map(region => (
              <MenuItem key={region.id} value={region.id}>
                {region.nombre}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>

      <Grid size={{ xs: 12, md: 2.4 }}>
        <FormControl fullWidth size='small' sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}>
          <InputLabel>{t('filters.department')}</InputLabel>
          <Select
            value={values.departamento}
            label={t('filters.department')}
            onChange={e => onChange('departamento', e.target.value)}
          >
            <MenuItem value=''>{t('filters.all')}</MenuItem>
            {catalogs.departments.map(dept => (
              <MenuItem key={dept.id} value={dept.nombre}>
                {dept.nombre}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>

      <Grid size={{ xs: 12, md: 2.4 }}>
        <FormControl fullWidth size='small' sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}>
          <InputLabel>{t('filters.client')}</InputLabel>
          <Select
            value={values.cliente}
            label={t('filters.client')}
            onChange={e => onChange('cliente', e.target.value)}
          >
            <MenuItem value=''>{t('filters.all')}</MenuItem>
            {catalogs.clients.map(client => (
              <MenuItem key={client.id} value={client.id}>
                {client.nombre}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>

      <Grid size={{ xs: 12, md: 2.4 }}>
        <FormControl fullWidth size='small' sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}>
          <InputLabel>{t('dashboard.warehouses.responsible')}</InputLabel>
          <Select
            value={values.responsable}
            label={t('dashboard.warehouses.responsible')}
            onChange={e => onChange('responsable', e.target.value)}
          >
            <MenuItem value=''>{t('filters.all')}</MenuItem>
            {catalogs.employees.map(emp => (
              <MenuItem key={emp.id} value={emp.id}>
                {emp.nombre}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
    </FilterShell>
  )
}

export default ProjectFilters
