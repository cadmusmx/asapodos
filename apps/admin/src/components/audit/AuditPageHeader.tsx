'use client'

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import AuditExportButton from './AuditExportButton'

export default function AuditPageHeader() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
      <Typography variant='h4' fontWeight='bold'>
        Log de Auditoría Global
      </Typography>
      <AuditExportButton />
    </Box>
  )
}
