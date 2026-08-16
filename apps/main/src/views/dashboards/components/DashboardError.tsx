'use client'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'

type Props = {
  message?: string
}

const DashboardError = ({ message }: Props) => {
  return (
    <Card>
      <CardContent>
        <Typography color='error'>{message || 'No data available'}</Typography>
      </CardContent>
    </Card>
  )
}

export default DashboardError
