'use client'

import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'

const TenantInactive = () => {
  return (
    <div className='flex items-center justify-center min-bs-[100dvh] relative p-6 overflow-x-hidden'>
      <div className='flex items-center flex-col text-center gap-8'>
        <div className='flex flex-col gap-3'>
          <Typography variant='h4' color='text.primary'>
            Organization Suspended
          </Typography>
          <Typography color='text.secondary'>This organization is currently suspended and not accessible.</Typography>
          <Typography variant='body2' color='text.disabled'>
            Please contact support to restore access.
          </Typography>
        </div>
        <div className='flex gap-4'>
          <Button variant='outlined' href='/' component='a'>
            Go to Homepage
          </Button>
          <Button variant='contained' href='/login' component='a'>
            Sign In
          </Button>
        </div>
      </div>
    </div>
  )
}

export default TenantInactive
