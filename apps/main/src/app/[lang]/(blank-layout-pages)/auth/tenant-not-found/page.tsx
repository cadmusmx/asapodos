'use client'

import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'

const TenantNotFound = () => {
  return (
    <div className='flex items-center justify-center min-bs-[100dvh] relative p-6 overflow-x-hidden'>
      <div className='flex items-center flex-col text-center gap-8'>
        <div className='flex flex-col gap-3'>
          <Typography variant='h4' color='text.primary'>
            Organization Not Found
          </Typography>
          <Typography color='text.secondary'>
            The organization associated with this address does not exist or may have been removed.
          </Typography>
          <Typography variant='body2' color='text.disabled'>
            Please check the URL or contact your administrator.
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

export default TenantNotFound
