import Skeleton from '@mui/material/Skeleton'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'

export default function Loading() {
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Skeleton variant='rectangular' width={36} height={36} sx={{ borderRadius: 1 }} />
        <Box sx={{ flex: 1 }}>
          <Skeleton variant='text' width={300} height={40} />
          <Skeleton variant='text' width={200} height={20} />
        </Box>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        {[1, 2, 3, 4, 5].map(i => (
          <Skeleton key={i} variant='text' width={100} height={48} sx={{ display: 'inline-block', mr: 2 }} />
        ))}
      </Box>

      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          {[1, 2, 3, 4].map(i => (
            <Box key={i} sx={{ flex: '1 1 200px' }}>
              <Skeleton variant='text' width={120} height={20} />
              <Skeleton variant='text' width={80} height={32} />
            </Box>
          ))}
        </Box>
      </Paper>
    </Box>
  )
}
