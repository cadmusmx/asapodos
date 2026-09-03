'use client'

import Grid from '@mui/material/Grid2'
import TextField from '@mui/material/TextField'

import FilterShell from '@views/dashboards/components/FilterShell'
import MultiSelectFilter from '@views/dashboards/components/MultiSelectFilter'

type CatalogItems = Array<{ id: number; nombre: string }>

type Props = {
  t: (key: string) => string
  filters: {
    projects: CatalogItems
    regions: CatalogItems
    departments: CatalogItems
    employees: CatalogItems
    expenseTypes: CatalogItems
  }
  values: {
    fechaInicio: string
    fechaFin: string
    estatus: string[]
    proyecto: string[]
    region: string[]
    tipoGasto: string[]
    departamento: string[]
    solicitante: string[]
  }
  onChange: (field: string, value: string | string[]) => void
  onSearch: () => void
  onClear: () => void
  onReload?: () => void
}

const STATUS_OPTIONS = [
  { value: '0', label: 'Pendiente' },
  { value: '1', label: 'Aceptada' },
  { value: '2', label: 'Rechazada' },
  { value: '4', label: 'Pagada' },
  { value: '5', label: 'Facturada' }
]

const ExpenseFilters = ({ t, filters, values, onChange, onSearch, onClear, onReload }: Props) => {
  return (
    <FilterShell t={t} onClear={onClear} onSearch={onSearch} onReload={onReload}>
      <Grid size={{ xs: 12, md: 2.4 }}>
        <MultiSelectFilter
          label={t('filters.status')}
          optionType={{ source: 'static', items: STATUS_OPTIONS }}
          value={values.estatus}
          onChange={v => onChange('estatus', v)}
        />
      </Grid>

      <Grid size={{ xs: 12, md: 2.4 }}>
        <MultiSelectFilter
          label={t('filters.project')}
          optionType={{ source: 'catalog', items: filters.projects }}
          value={values.proyecto}
          onChange={v => onChange('proyecto', v)}
        />
      </Grid>

      <Grid size={{ xs: 12, md: 2.4 }}>
        <MultiSelectFilter
          label={t('filters.region')}
          optionType={{ source: 'catalog', items: filters.regions }}
          value={values.region}
          onChange={v => onChange('region', v)}
        />
      </Grid>

      <Grid size={{ xs: 12, md: 2.4 }}>
        <TextField
          type='date'
          label={t('filters.dateStart')}
          size='small'
          fullWidth
          InputLabelProps={{ shrink: true }}
          value={values.fechaInicio}
          onChange={e => onChange('fechaInicio', e.target.value)}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
        />
      </Grid>

      <Grid size={{ xs: 12, md: 2.4 }}>
        <TextField
          type='date'
          label={t('filters.dateEnd')}
          size='small'
          fullWidth
          InputLabelProps={{ shrink: true }}
          value={values.fechaFin}
          onChange={e => onChange('fechaFin', e.target.value)}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
        />
      </Grid>

      <Grid size={{ xs: 12, md: 2.4 }}>
        <MultiSelectFilter
          label={t('filters.expenseType')}
          optionType={{ source: 'catalog', items: filters.expenseTypes }}
          value={values.tipoGasto}
          onChange={v => onChange('tipoGasto', v)}
        />
      </Grid>

      <Grid size={{ xs: 12, md: 2.4 }}>
        <MultiSelectFilter
          label={t('filters.department')}
          optionType={{ source: 'catalog', items: filters.departments }}
          value={values.departamento}
          onChange={v => onChange('departamento', v)}
        />
      </Grid>

      <Grid size={{ xs: 12, md: 2.4 }}>
        <MultiSelectFilter
          label={t('filters.applicant')}
          optionType={{ source: 'catalog', items: filters.employees }}
          value={values.solicitante}
          onChange={v => onChange('solicitante', v)}
        />
      </Grid>
    </FilterShell>
  )
}

export default ExpenseFilters
