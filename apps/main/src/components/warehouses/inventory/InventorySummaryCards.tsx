import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid2'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { formatInventoryQuantity } from '@/lib/inventory/presentation'

import type { InventoryListSummary } from '@/types/inventory'

type InventorySummaryCardsProps = {
    summary: InventoryListSummary
    loading: boolean
}

const InventorySummaryCards = ({
    summary,
    loading
}: InventorySummaryCardsProps) => {
    const cards = [
        {
            label: 'SKUs',
            value: summary.totalSkus,
            helper: `${summary.totalRows} registros de stock`,
            icon: 'ri-barcode-line'
        },
        {
            label: 'Existencia',
            value: summary.onHand,
            helper: 'Cantidad física registrada',
            icon: 'ri-archive-stack-line'
        },
        {
            label: 'Reservado',
            value: summary.reserved,
            helper: 'Cantidad comprometida',
            icon: 'ri-lock-line'
        },
        {
            label: 'Disponible',
            value: summary.available,
            helper: 'Existencia menos reservado',
            icon: 'ri-checkbox-circle-line'
        }
    ]

    return (
        <Grid container spacing={3}>
            {cards.map(card => (
                <Grid key={card.label} size={{ xs: 12, sm: 6, lg: 3 }}>
                    <Card sx={{ height: '100%' }}>
                        <CardContent>
                            <Stack direction='row' spacing={3} alignItems='center'>
                                <Avatar
                                    variant='rounded'
                                    sx={{
                                        width: 46,
                                        height: 46,
                                        bgcolor: 'action.hover',
                                        color: 'text.primary'
                                    }}
                                >
                                    <i className={card.icon} />
                                </Avatar>

                                <Box>
                                    <Typography variant='body2' color='text.secondary'>
                                        {card.label}
                                    </Typography>

                                    <Typography variant='h5'>
                                        {loading
                                            ? '—'
                                            : formatInventoryQuantity(card.value)}
                                    </Typography>

                                    <Typography variant='caption' color='text.secondary'>
                                        {card.helper}
                                    </Typography>
                                </Box>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
            ))}
        </Grid>
    )
}

export default InventorySummaryCards
