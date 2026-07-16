import Skeleton from '@mui/material/Skeleton'
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Paper from '@mui/material/Paper'

export default function Loading() {
  return (
    <Box sx={{ mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Skeleton variant='rectangular' width={36} height={36} sx={{ borderRadius: 1 }} />
        <Skeleton variant='text' width={250} height={40} />
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Skeleton variant='text' width={80} height={24} sx={{ mb: 2 }} />
            <Skeleton variant='text' width={60} height={48} sx={{ mb: 1 }} />
            <Skeleton variant='text' width={200} height={20} />
          </Paper>
        </Grid>

        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2 }}>
            <Skeleton variant='text' width={120} height={24} sx={{ mb: 2 }} />
            <Grid container spacing={2}>
              <Grid item xs={4}>
                <Skeleton variant='text' width={80} height={16} />
                <Skeleton variant='text' width={60} height={32} />
              </Grid>
              <Grid item xs={4}>
                <Skeleton variant='text' width={80} height={16} />
                <Skeleton variant='text' width={60} height={32} />
              </Grid>
              <Grid item xs={4}>
                <Skeleton variant='text' width={80} height={16} />
                <Skeleton variant='text' width={60} height={32} />
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Skeleton variant='text' width={200} height={24} />
              <Skeleton variant='rectangular' width={100} height={24} sx={{ borderRadius: 1 }} />
            </Box>
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} variant='rectangular' height={40} sx={{ mb: 1, borderRadius: 1 }} />
            ))}
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Skeleton variant='text' width={180} height={24} sx={{ mb: 2 }} />
            {[1, 2, 3].map(i => (
              <Skeleton key={i} variant='rectangular' height={48} sx={{ mb: 1, borderRadius: 1 }} />
            ))}
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Skeleton variant='text' width={180} height={24} sx={{ mb: 2 }} />
            {[1, 2, 3].map(i => (
              <Skeleton key={i} variant='rectangular' height={48} sx={{ mb: 1, borderRadius: 1 }} />
            ))}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}
