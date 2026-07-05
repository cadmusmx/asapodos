'use client'

// Next Imports
import Link from 'next/link'
import { useParams } from 'next/navigation'

// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'

// Type Imports
import type { Locale } from '@configs/i18n'

// Utils
import { getLocalizedUrl } from '@/utils/i18n'

type Props = {
  title?: string
  message?: string
}

const AccessDenied = ({
  title = 'Acceso denegado',
  message = 'No tienes permisos para acceder a este módulo.'
}: Props) => {
  const { lang: locale } = useParams()

  return (
    <Box className='flex min-bs-[60vh] items-center justify-center p-6'>
      <Card className='is-full max-is-[560px]'>
        <CardContent className='flex flex-col items-center gap-4 text-center p-8'>
          <div className='flex items-center justify-center rounded-full bg-errorLight bs-16 is-16'>
            <i className='ri-shield-user-line text-4xl text-error' />
          </div>

          <div className='flex flex-col gap-2'>
            <Typography variant='h4'>{title}</Typography>
            <Typography color='text.secondary'>{message}</Typography>
          </div>

          <Button
            component={Link}
            href={getLocalizedUrl('/dashboards/general', locale as Locale)}
            variant='contained'
          >
            Volver al dashboard
          </Button>
        </CardContent>
      </Card>
    </Box>
  )
}

export default AccessDenied
