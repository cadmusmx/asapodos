'use client'

import Box from '@mui/material/Box'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  return (
    <Box sx={{ p: 3 }}>
      <Alert severity='error' sx={{ mb: 3 }} role='alert'>
        <Typography fontWeight='bold'>Error al cargar los tenants</Typography>
        <Typography variant='body2'>{error.message || 'Ocurrió un error inesperado'}</Typography>
      </Alert>

      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button variant='outlined' onClick={reset}>
          Reintentar
        </Button>
        <Button variant='text' href='/admin/tenants'>
          Volver a la lista
        </Button>
      </Box>
    </Box>
  )
}
