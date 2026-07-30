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
  catalogs: {
    clients: Array<{ id: number; nombre: string }>
    regions: Array<{ id: number; nombre: string }>
    departments: Array<{ id: number; nombre: string }>
    employees: Array<{ id: number; nombre: string }>
  }
}

const ProjectFilters = ({ t, values, onChange, onSearch, onClear, catalogs }: Props) => {
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

          <Grid size={{ xs: 12, md: 2 }}>
            <FormControl fullWidth size='small' sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}>
              <InputLabel>{t('filters.status')}</InputLabel>
              <Select
                value={values.estatus}
                label={t('filters.status')}
                onChange={(e) => onChange('estatus', e.target.value)}
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
              <Select
                value={values.region}
                label={t('filters.region')}
                onChange={(e) => onChange('region', e.target.value)}
              >
                <MenuItem value=''>{t('filters.select')}</MenuItem>
                {catalogs.regions.map((region) => (
                  <MenuItem key={region.id} value={region.id}>{region.nombre}</MenuItem>
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
                <MenuItem value=''>{t('filters.select')}</MenuItem>
                {catalogs.departments.map((dept) => (
                  <MenuItem key={dept.id} value={dept.nombre}>{dept.nombre}</MenuItem>
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
                onChange={(e) => onChange('cliente', e.target.value)}
              >
                <MenuItem value=''>{t('filters.select')}</MenuItem>
                {catalogs.clients.map((client) => (
                  <MenuItem key={client.id} value={client.id}>{client.nombre}</MenuItem>
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
                onChange={(e) => onChange('responsable', e.target.value)}
              >
                <MenuItem value=''>{t('filters.select')}</MenuItem>
                {catalogs.employees.map((emp) => (
                  <MenuItem key={emp.id} value={emp.id}>{emp.nombre}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  )
}

export default ProjectFilters
