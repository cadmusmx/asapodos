'use client';

// MUI Imports
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid2';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import Skeleton from '@mui/material/Skeleton';

export interface VehicleStats {
  total: number;
  polizasVencidas: number;
  tarjetasVencidas: number;
  verificacionProxima: number;
}

type CardColor = 'primary' | 'error' | 'warning';

interface CardDef {
  key: keyof VehicleStats;
  title: string;
  icon: string;
  color: CardColor;
}

// Las cifras respetan los MISMOS filtros que la tabla (métricas del set filtrado).
const CARDS: CardDef[] = [
  { key: 'total', title: 'Vehículos', icon: 'ri-car-line', color: 'primary' },
  { key: 'polizasVencidas', title: 'Pólizas vencidas', icon: 'ri-shield-cross-line', color: 'error' },
  { key: 'tarjetasVencidas', title: 'Tarjetas vencidas', icon: 'ri-bank-card-line', color: 'error' },
  { key: 'verificacionProxima', title: 'Verificación ≤ 30 días', icon: 'ri-calendar-check-line', color: 'warning' },
];

const VehiclesStatCards = ({ stats, loading }: { stats: VehicleStats | null; loading: boolean }) => {
  return (
    <Grid container spacing={4} className='mbe-4'>
      {CARDS.map(card => (
        <Grid key={card.key} size={{ xs: 6, md: 3 }}>
          <Card>
            <CardContent className='flex items-center gap-4'>
              <Avatar variant='rounded' className={`bg-${card.color}`} sx={{ '&': { color: 'white' } }}>
                <i className={card.icon} />
              </Avatar>
              <div>
                <Typography variant='h5'>
                  {loading || !stats ? <Skeleton width={40} /> : stats[card.key]}
                </Typography>
                <Typography variant='body2' color='text.secondary'>
                  {card.title}
                </Typography>
              </div>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};

export default VehiclesStatCards;
