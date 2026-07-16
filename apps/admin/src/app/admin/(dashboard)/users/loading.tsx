import Skeleton from '@mui/material/Skeleton'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'

export default function Loading() {
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Skeleton variant='text' width={200} height={40} />
        <Skeleton variant='rectangular' width={140} height={36} sx={{ borderRadius: 1 }} />
      </Box>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <Skeleton variant='rectangular' width={250} height={56} />
          <Skeleton variant='rectangular' width={180} height={56} />
        </Stack>
      </Paper>

      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <Box sx={{ p: 2 }}>
          <Stack spacing={1}>
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} variant='rectangular' height={52} sx={{ borderRadius: 1 }} />
            ))}
          </Stack>
        </Box>
      </Paper>
    </Box>
  )
}
