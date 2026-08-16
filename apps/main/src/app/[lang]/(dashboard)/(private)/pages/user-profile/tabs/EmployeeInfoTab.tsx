'use client'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid2'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import type { ProfileEmployeeInfo } from '@/types/profile'

type Props = {
  employee: ProfileEmployeeInfo | null
}

const statusConfig: Record<string, { label: string; color: 'success' | 'default' | 'warning' | 'error' }> = {
  active: { label: 'Activo', color: 'success' },
  inactive: { label: 'Inactivo', color: 'default' },
  on_leave: { label: 'Permiso', color: 'warning' },
  terminated: { label: 'Terminado', color: 'error' }
}

const formatDate = (value: string | null): string => {
  if (!value) return '—'

  try {
    return new Date(value).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  } catch {
    return value
  }
}

const FieldGroup = ({
  label,
  value,
  mono = false
}: {
  label: string
  value: React.ReactNode
  mono?: boolean
}) => (
  <Box>
    <Typography variant='caption' color='text.secondary' display='block'>
      {label}
    </Typography>
    <Typography
      component='div'
      variant='body2'
      sx={{
        fontFamily: mono ? 'monospace' : undefined,
        fontSize: mono ? '0.8125rem' : undefined
      }}
    >
      {value}
    </Typography>
  </Box>
)

const EmployeeInfoTab = ({ employee }: Props) => {
  if (!employee) {
    return (
      <Alert severity='info'>
        No hay información de empleado asociada a tu cuenta. Contacta a un administrador si crees que esto es un error.
      </Alert>
    )
  }

  const status = statusConfig[employee.employmentStatus] ?? {
    label: employee.employmentStatus,
    color: 'default' as const
  }

  return (
    <Stack spacing={3}>
      <Card>
        <CardHeader
          title='Datos del empleado'
          subheader='Información organizacional assignedada a tu cuenta'
          titleTypographyProps={{ variant: 'h6' }}
        />
        <CardContent>
          <Stack spacing={3}>
            <Box>
              <Box display='flex' alignItems='center' gap={1.5} flexWrap='wrap'>
                <Typography variant='h5' fontWeight={600}>
                  {employee.fullName}
                </Typography>
                <Chip label={status.label} color={status.color} size='small' variant='tonal' />
              </Box>
              <Typography variant='body2' color='text.secondary' mt={0.5}>
                {employee.employeeNumber ? `No. ${employee.employeeNumber}` : 'Sin número de empleado'}
              </Typography>
            </Box>

            <Divider />

            <Grid container spacing={3}>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <FieldGroup label='Departamento' value={employee.departmentName ?? '—'} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <FieldGroup label='Puesto' value={employee.positionName ?? '—'} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <FieldGroup label='Área' value={employee.areaName ?? '—'} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <FieldGroup label='Región' value={employee.regionName ?? '—'} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <FieldGroup label='Fecha de ingreso' value={formatDate(employee.hireDate)} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <FieldGroup label='Estado' value={<Chip label={status.label} color={status.color} size='small' variant='tonal' />} />
              </Grid>
            </Grid>
          </Stack>
        </CardContent>
      </Card>

      {(employee.curp || employee.rfc || employee.nss) && (
        <Card>
          <CardHeader
            title='Identificadores'
            subheader='Claves fiscales y de seguridad social'
            titleTypographyProps={{ variant: 'h6' }}
          />
          <CardContent>
            <Grid container spacing={3}>
              {employee.curp && (
                <Grid size={{ xs: 12, sm: 4 }}>
                  <FieldGroup label='CURP' value={employee.curp} mono />
                </Grid>
              )}
              {employee.rfc && (
                <Grid size={{ xs: 12, sm: 4 }}>
                  <FieldGroup label='RFC' value={employee.rfc} mono />
                </Grid>
              )}
              {employee.nss && (
                <Grid size={{ xs: 12, sm: 4 }}>
                  <FieldGroup label='NSS' value={employee.nss} mono />
                </Grid>
              )}
            </Grid>
          </CardContent>
        </Card>
      )}
    </Stack>
  )
}

export default EmployeeInfoTab
