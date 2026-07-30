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
import TextField from '@mui/material/TextField'

type Props = {
  t: (key: string) => string
  filters: {
    projects: Array<{ id: number; nombre: string }>
    regions: Array<{ id: number; nombre: string }>
    departments: Array<{ id: number; nombre: string }>
    employees: Array<{ id: number; nombre: string }>
    expenseTypes: Array<{ id: number; nombre: string }>
  }
  values: {
    fechaInicio: string
    fechaFin: string
    estatus: string
    proyecto: string
    region: string
    tipoGasto: string
    departamento: string
    solicitante: string
  }
  onChange: (field: string, value: string) => void
  onSearch: () => void
  onClear: () => void
}

const ExpenseFilters = ({ t, filters, values, onChange, onSearch, onClear }: Props) => {
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
                <MenuItem value='5'>{t('dashboard.expenses.invoiced')}</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, md: 2.4 }}>
            <FormControl fullWidth size='small' sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}>
              <InputLabel>{t('filters.project')}</InputLabel>
              <Select
                value={values.proyecto}
                label={t('filters.project')}
                onChange={(e) => onChange('proyecto', e.target.value)}
              >
                <MenuItem value=''>{t('filters.all')}</MenuItem>
                {filters.projects.map((p) => (
                  <MenuItem key={p.id} value={p.id}>{p.nombre}</MenuItem>
                ))}
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
                {filters.regions.map((r) => (
                  <MenuItem key={r.id} value={r.id}>{r.nombre}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, md: 2.4 }}>
            <TextField
              type='date'
              label={t('filters.dateStart')}
              size='small'
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={values.fechaInicio}
              onChange={(e) => onChange('fechaInicio', e.target.value)}
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
              onChange={(e) => onChange('fechaFin', e.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 2.4 }}>
            <FormControl fullWidth size='small' sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}>
              <InputLabel>{t('filters.expenseType')}</InputLabel>
              <Select
                value={values.tipoGasto}
                label={t('filters.expenseType')}
                onChange={(e) => onChange('tipoGasto', e.target.value)}
              >
                <MenuItem value=''>{t('filters.all')}</MenuItem>
                {filters.expenseTypes.map((et) => (
                  <MenuItem key={et.id} value={et.id}>{et.nombre}</MenuItem>
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
                onChange={(e) => onChange('departamento', e.target.value)}
              >
                <MenuItem value=''>{t('filters.all')}</MenuItem>
                {filters.departments.map((d) => (
                  <MenuItem key={d.id} value={d.id}>{d.nombre}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, md: 2.4 }}>
            <FormControl fullWidth size='small' sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}>
              <InputLabel>{t('filters.applicant')}</InputLabel>
              <Select
                value={values.solicitante}
                label={t('filters.applicant')}
                onChange={(e) => onChange('solicitante', e.target.value)}
              >
                <MenuItem value=''>{t('filters.all')}</MenuItem>
                {filters.employees.map((e) => (
                  <MenuItem key={e.id} value={e.id}>{e.nombre}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  )
}

export default ExpenseFilters
