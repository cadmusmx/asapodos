import Skeleton from '@mui/material/Skeleton'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Grid from '@mui/material/Grid'

export default function Loading() {
  return (
    <Box>
      <Skeleton variant='text' width={200} height={40} sx={{ mb: 1 }} />
      <Skeleton variant='text' width={300} height={20} sx={{ mb: 4 }} />

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {[1, 2, 3, 4, 5].map(i => (
          <Grid item xs={6} sm={4} md={2} key={i}>
            <Paper sx={{ p: 2 }}>
              <Skeleton variant='text' width={60} height={48} sx={{ mx: 'auto' }} />
              <Skeleton variant='text' width={80} height={20} sx={{ mx: 'auto', mt: 1 }} />
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2 }}>
            <Skeleton variant='text' width={150} height={24} sx={{ mb: 2 }} />
            <Skeleton variant='text' width={80} height={16} sx={{ mb: 1 }} />
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <Skeleton key={i} variant='rectangular' height={48} sx={{ mb: 1, borderRadius: 1 }} />
            ))}
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Skeleton variant='text' width={120} height={24} sx={{ mb: 2 }} />
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} variant='rectangular' height={40} sx={{ mb: 1, borderRadius: 1 }} />
            ))}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}
