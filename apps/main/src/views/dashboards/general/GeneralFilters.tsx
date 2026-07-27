'use client'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid2'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import Button from '@mui/material/Button'

type Props = {
  t: (key: string) => string
  values: {
    year: string
    region: string
  }
  onChange: (field: string, value: string) => void
  onSearch: () => void
  onClear: () => void
  regions?: Array<{ id: number; nombre: string }>
}

const GeneralFilters = ({ t, values, onChange, onSearch, onClear, regions = [] }: Props) => {
  return (
    <Card sx={{ borderRadius: '14px', border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(15,23,42,.05)', mb: 3 }}>
      <CardContent sx={{ p: '1rem 1.25rem .75rem !important' }}>
        <Grid container spacing={2} alignItems='center'>
          <Grid size={{ xs: 12, md: 3 }}>
            <FormControl fullWidth size='small'>
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
          <Grid size={{ xs: 12, md: 3 }}>
            <FormControl fullWidth size='small'>
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
          <Grid size={{ xs: 12, md: 5.5 }} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button
              variant='outlined'
              onClick={onClear}
              sx={{
                borderRadius: '10px',
                py: 1,
                px: 2,
                minWidth: 0,
                borderColor: '#e5e7eb',
                color: '#6b7280',
                '&:hover': {
                  borderColor: '#d1d5db',
                  background: 'rgba(0,0,0,.02)'
                }
              }}
            >
              <i className='ri-close-line' style={{ marginRight: 4 }} />
              {t('filters.clear')}
            </Button>
            <Button
              variant='contained'
              onClick={onSearch}
              sx={{
                borderRadius: '10px',
                py: 1,
                px: 3,
                background: 'linear-gradient(135deg, #0d6efd, #0056b3)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #0056b3, #003d80)'
                }
              }}
            >
              <i className='ri-search-line' style={{ marginRight: 8 }} />
              {t('filters.search')}
            </Button>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  )
}

export default GeneralFilters
