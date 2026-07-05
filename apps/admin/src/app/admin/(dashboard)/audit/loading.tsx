import Skeleton from '@mui/material/Skeleton'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'

export default function Loading() {
  return (
    <Box>
      <Skeleton variant='text' width={250} height={40} sx={{ mb: 3 }} />

      <Paper sx={{ mb: 3, p: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Skeleton variant='rectangular' width={180} height={56} />
          <Skeleton variant='rectangular' width={180} height={56} />
          <Skeleton variant='rectangular' width={150} height={56} />
          <Skeleton variant='rectangular' width={150} height={56} />
          <Skeleton variant='rectangular' width={150} height={56} />
          <Skeleton variant='rectangular' width={100} height={56} />
        </Box>
      </Paper>

      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} variant='text' width={80} height={24} />
            ))}
          </Box>
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} variant='rectangular' height={52} sx={{ mb: 1, borderRadius: 1 }} />
          ))}
        </Box>
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
          <Skeleton variant='rectangular' width={300} height={52} />
        </Box>
      </Paper>
    </Box>
  )
}
