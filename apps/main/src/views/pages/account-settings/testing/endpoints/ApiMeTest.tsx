import Grid from '@mui/material/Grid2'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'

import ApiTestCard, { type ApiState } from '../components/ApiTestCard'

type MeResponse = {
  user: {
    id: number
    name: string
    email: string
    admin: boolean
    area: number | null
    cityBase: number | null
    position: number | null
    region: number | null
    company: number | null
  }
  tenant: {
    id: string
    slug: string
    name: string
    isActive: boolean
  }
  profile: {
    id: number | null
    name: string | null
  }
  permissions: Array<{
    moduleId: number
    moduleName: string
    subModules: Array<{ id: number; name: string }>
  }>
}

type Props = {
  state: ApiState
  data: MeResponse | null
  error: string | null
  refetch: () => void
}

function MeDisplay({ state, data }: Props) {
  if (state !== 'success' || !data) return null

  return (
    <Grid container spacing={4}>
      <Grid size={{ xs: 12, md: 6 }}>
        <Typography variant='subtitle2' color='text.secondary' gutterBottom>
          USER
        </Typography>
        <Box className='flex flex-col gap-2'>
          {([
            ['ID', data.user.id],
            ['Name', data.user.name],
            ['Email', data.user.email],
            ['Admin', data.user.admin ? 'Yes' : 'No'],
            ['Area', data.user.area],
            ['City Base', data.user.cityBase],
            ['Position', data.user.position],
            ['Region', data.user.region],
            ['Company', data.user.company]
          ] as [string, unknown][]).map(([label, value]) => (
            <Box key={label} className='flex items-center justify-between'>
              <Typography variant='body2' color='text.secondary'>{label}</Typography>
              <Typography variant='body2' className='font-medium'>
                {String(value ?? 'null')}
              </Typography>
            </Box>
          ))}
        </Box>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <Typography variant='subtitle2' color='text.secondary' gutterBottom>
          TENANT
        </Typography>
        <Box className='flex flex-col gap-2'>
          {([
            ['ID', data.tenant.id],
            ['Slug', data.tenant.slug],
            ['Name', data.tenant.name],
            ['Active', data.tenant.isActive ? 'Yes' : 'No']
          ] as [string, unknown][]).map(([label, value]) => (
            <Box key={label} className='flex items-center justify-between'>
              <Typography variant='body2' color='text.secondary'>{label}</Typography>
              <Typography variant='body2' className='font-medium'>
                {String(value ?? 'null')}
              </Typography>
            </Box>
          ))}
        </Box>

        <Divider className='my-4' />

        <Typography variant='subtitle2' color='text.secondary' gutterBottom>
          PROFILE
        </Typography>
        <Box className='flex flex-col gap-2'>
          {([
            ['ID', data.profile.id],
            ['Name', data.profile.name]
          ] as [string, unknown][]).map(([label, value]) => (
            <Box key={label} className='flex items-center justify-between'>
              <Typography variant='body2' color='text.secondary'>{label}</Typography>
              <Typography variant='body2' className='font-medium'>
                {String(value ?? 'null')}
              </Typography>
            </Box>
          ))}
        </Box>
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Typography variant='subtitle2' color='text.secondary' gutterBottom>
          PERMISSIONS ({data.permissions.length})
        </Typography>
        {data.permissions.length === 0 ? (
          <Typography variant='body2' color='text.secondary'>
            No permissions found
          </Typography>
        ) : (
          <Box className='flex flex-col gap-2'>
            {data.permissions.map(mod => (
              <Card key={mod.moduleId} variant='outlined'>
                <CardContent className='flex flex-col gap-1 py-3'>
                  <Box className='flex items-center gap-2'>
                    <Chip label={`ID: ${mod.moduleId}`} size='small' variant='outlined' />
                    <Typography variant='body2' className='font-medium'>
                      {mod.moduleName || '—'}
                    </Typography>
                  </Box>
                  {mod.subModules.length > 0 && (
                    <Box className='flex flex-wrap gap-1 mt-1'>
                      {mod.subModules.map(sm => (
                        <Chip
                          key={sm.id}
                          label={`${sm.id} — ${sm.name}`}
                          size='small'
                          color='primary'
                          variant='filled'
                        />
                      ))}
                    </Box>
                  )}
                </CardContent>
              </Card>
            ))}
          </Box>
        )}
      </Grid>
    </Grid>
  )
}

export default function ApiMeTest() {
  return (
    <ApiTestCard<MeResponse>
      config={{
        title: 'GET /api/me',
        subheader: 'Authenticated profile endpoint',
        endpoint: '/api/me',
        method: 'GET',
        autoFetch: true
      }}
    >
      {(state, data, error, refetch) => (
        <MeDisplay state={state} data={data} error={error} refetch={refetch} />
      )}
    </ApiTestCard>
  )
}