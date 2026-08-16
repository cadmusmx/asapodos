'use client'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'

const DashboardLoading = () => {
  return (
    <Card>
      <CardContent sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </CardContent>
    </Card>
  )
}

export default DashboardLoading
