'use client'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import Grid from '@mui/material/Grid2'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import type { ProfileResponse } from '@/types/profile'

type Props = {
  profile: ProfileResponse
}

const PersonalInfoTab = ({ profile }: Props) => {
  const emp = profile.employee

  return (
    <Stack spacing={3}>
      <Card>
        <CardHeader
          title='Información de la cuenta'
          subheader='Datos de acceso a la plataforma'
          titleTypographyProps={{ variant: 'h6' }}
        />
        <CardContent>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Box>
                <Typography variant='caption' color='text.secondary' gutterBottom>
                  Nombre completo
                </Typography>
                <Box display='flex' alignItems='center' gap={1}>
                  <Typography variant='body1'>
                    {emp?.fullName ?? profile.nombre ?? '—'}
                  </Typography>
                  <Chip label='Solo lectura' size='small' variant='outlined' color='default' />
                </Box>
              </Box>
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <Box>
                <Typography variant='caption' color='text.secondary' gutterBottom>
                  Nombre de usuario
                </Typography>
                <Box display='flex' alignItems='center' gap={1}>
                  <Typography variant='body1'>@{profile.usuario}</Typography>
                  <Chip label='Solo lectura' size='small' variant='outlined' color='default' />
                </Box>
              </Box>
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <Box>
                <Typography variant='caption' color='text.secondary' gutterBottom>
                  Correo electrónico
                </Typography>
                <Box display='flex' alignItems='center' gap={1}>
                  <Typography variant='body1'>{profile.email ?? '—'}</Typography>
                  <Chip label='Solo lectura' size='small' variant='outlined' color='default' />
                </Box>
              </Box>
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <Box>
                <Typography variant='caption' color='text.secondary' gutterBottom>
                  Número de empleado
                </Typography>
                <Box display='flex' alignItems='center' gap={1}>
                  <Typography variant='body1'>{emp?.employeeNumber ?? '—'}</Typography>
                  <Chip label='Solo lectura' size='small' variant='outlined' color='default' />
                </Box>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Stack>
  )
}

export default PersonalInfoTab
