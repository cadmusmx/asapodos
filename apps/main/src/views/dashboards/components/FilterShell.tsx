'use client'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid2'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'

type FilterShellProps = {
  t: (key: string) => string
  onClear: () => void
  onSearch: () => void
  onReload?: () => void
  children: React.ReactNode
}

const FilterShell = ({ t, onClear, onSearch, onReload, children }: FilterShellProps) => {
  return (
    <Card sx={{ borderRadius: '16px', border: '1px solid', borderColor: 'divider', boxShadow: 'none', mb: 3 }}>
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
                  background:
                    'linear-gradient(135deg, var(--mui-palette-primary-dark), var(--mui-palette-primary-dark))',
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
                background:
                  'linear-gradient(135deg, rgba(var(--mui-palette-primary-mainChannel) / 0.13), rgba(var(--mui-palette-primary-mainChannel) / 0.07))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                ml: 1
              }}
            >
              <i className='ri-filter-3-line' style={{ fontSize: '1rem', color: 'var(--mui-palette-primary-main)' }} />
            </Box>
            <Box
              component='span'
              sx={{
                fontSize: '0.8rem',
                fontWeight: 600,
                color: 'text.secondary',
                textTransform: 'uppercase',
                letterSpacing: 0.8
              }}
            >
              {t('filters.filters')}
            </Box>
          </Grid>
          {children}
        </Grid>
      </CardContent>
    </Card>
  )
}

export default FilterShell
