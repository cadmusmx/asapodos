'use client'

import Grid from '@mui/material/Grid2'
import TextField from '@mui/material/TextField'

import FilterShell from '@views/dashboards/components/FilterShell'
import MultiSelectFilter from '@views/dashboards/components/MultiSelectFilter'

type CatalogItems = Array<{ id: number; nombre: string }>

type Props = {
  t: (key: string) => string
  values: {
    fechaInicio: string
    fechaFin: string
    noEconomico: string[]
    tipoGasto: string[]
    responsable: string[]
    estatus: string[]
  }
  onChange: (field: string, value: string | string[]) => void
  onSearch: () => void
  onClear: () => void
  onReload?: () => void
  vehicleNoEconomico?: CatalogItems
  vehicleExpenseTypes?: CatalogItems
  vehicleResponsibles?: CatalogItems
}

const STATUS_OPTIONS = [
  { value: '0', label: 'Pendiente' },
  { value: '1', label: 'Aceptada' },
  { value: '2', label: 'Rechazada' },
  { value: '4', label: 'Pagada' },
  { value: '5', label: 'Facturada' }
]

const FleetFilters = ({
  t,
  values,
  onChange,
  onSearch,
  onClear,
  onReload,
  vehicleNoEconomico = [],
  vehicleExpenseTypes = [],
  vehicleResponsibles = []
}: Props) => {
  return (
    <FilterShell t={t} onClear={onClear} onSearch={onSearch} onReload={onReload}>
      <Grid size={{ xs: 12, md: 2.4 }}>
        <MultiSelectFilter
          label={t('dashboard.fleets.economicoNo')}
          optionType={{ source: 'catalog', items: vehicleNoEconomico }}
          value={values.noEconomico}
          onChange={v => onChange('noEconomico', v)}
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
          label={t('dashboard.fleets.expenseType')}
          optionType={{ source: 'catalog', items: vehicleExpenseTypes }}
          value={values.tipoGasto}
          onChange={v => onChange('tipoGasto', v)}
        />
      </Grid>

      <Grid size={{ xs: 12, md: 2.4 }}>
        <MultiSelectFilter
          label={t('dashboard.fleets.responsible')}
          optionType={{ source: 'catalog', items: vehicleResponsibles }}
          value={values.responsable}
          onChange={v => onChange('responsable', v)}
        />
      </Grid>

      <Grid size={{ xs: 12, md: 2.4 }}>
        <MultiSelectFilter
          label={t('filters.status')}
          optionType={{ source: 'static', items: STATUS_OPTIONS }}
          value={values.estatus}
          onChange={v => onChange('estatus', v)}
        />
      </Grid>
    </FilterShell>
  )
}

export default FleetFilters
