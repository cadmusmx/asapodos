import Grid from '@mui/material/Grid2'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'

import type { MeResponse } from '@gaso/shared/types/me'

import ApiTestCard, { type ApiState } from '../components/ApiTestCard'

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
      {/* data.permissions migrado por rbac */}
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
