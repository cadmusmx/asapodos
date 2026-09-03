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

import { useTranslatePage } from '@/contexts/dictionaryContext'

import type { ProfileEmployeeInfo } from '@/types/profile'

type Props = {
  employee: ProfileEmployeeInfo | null
}

type StatusKey = 'active' | 'inactive' | 'on_leave' | 'terminated'

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

const FieldGroup = ({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) => (
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
  const { t } = useTranslatePage()

  if (!employee) {
    return <Alert severity='info'>{t('userProfile.employeeInfoTab.noEmployeeInfo')}</Alert>
  }

  const statusConfig: Record<StatusKey, { color: 'success' | 'default' | 'warning' | 'error' }> = {
    active: { color: 'success' },
    inactive: { color: 'default' },
    on_leave: { color: 'warning' },
    terminated: { color: 'error' }
  }

  const statusLabels: Record<StatusKey, string> = {
    active: t('userProfile.employeeInfoTab.active'),
    inactive: t('userProfile.employeeInfoTab.inactive'),
    on_leave: t('userProfile.employeeInfoTab.onLeave'),
    terminated: t('userProfile.employeeInfoTab.terminated')
  }

  const employeeStatus = employee.employmentStatus as StatusKey
  const status = statusConfig[employeeStatus] ?? { color: 'default' as const }
  const statusLabel = statusLabels[employeeStatus] ?? employeeStatus

  return (
    <Stack spacing={3}>
      <Card>
        <CardHeader
          title={t('userProfile.employeeInfoTab.employeeData')}
          subheader={t('userProfile.employeeInfoTab.orgInfo')}
          titleTypographyProps={{ variant: 'h6' }}
        />
        <CardContent>
          <Stack spacing={3}>
            <Box>
              <Box display='flex' alignItems='center' gap={1.5} flexWrap='wrap'>
                <Typography variant='h5' fontWeight={600}>
                  {employee.fullName}
                </Typography>
                <Chip label={statusLabel} color={status.color} size='small' variant='tonal' />
              </Box>
              <Typography variant='body2' color='text.secondary' mt={0.5}>
                {employee.employeeNumber
                  ? `No. ${employee.employeeNumber}`
                  : t('userProfile.employeeInfoTab.noEmployeeNum')}
              </Typography>
            </Box>

            <Divider />

            <Grid container spacing={3}>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <FieldGroup
                  label={t('userProfile.employeeInfoTab.department')}
                  value={employee.departmentName ?? '—'}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <FieldGroup label={t('userProfile.employeeInfoTab.position')} value={employee.positionName ?? '—'} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <FieldGroup label={t('userProfile.employeeInfoTab.area')} value={employee.areaName ?? '—'} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <FieldGroup label={t('userProfile.employeeInfoTab.region')} value={employee.regionName ?? '—'} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <FieldGroup label={t('userProfile.employeeInfoTab.hireDate')} value={formatDate(employee.hireDate)} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <FieldGroup
                  label={t('userProfile.employeeInfoTab.status')}
                  value={<Chip label={statusLabel} color={status.color} size='small' variant='tonal' />}
                />
              </Grid>
            </Grid>
          </Stack>
        </CardContent>
      </Card>

      {(employee.curp || employee.rfc || employee.nss) && (
        <Card>
          <CardHeader
            title={t('userProfile.employeeInfoTab.identifiers')}
            subheader={t('userProfile.employeeInfoTab.taxIds')}
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
