'use client';

// React Imports
import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

// Next Imports
import { useParams, useRouter } from 'next/navigation';

// MUI Imports
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid2';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';

// Base pública de S3 (llaves en BD; URL = base + llave). Igual que VM.
const S3_BASE = process.env.NEXT_PUBLIC_S3_PUBLIC_BASE_URL ?? '';

const photoUrl = (key?: string | null): string => {
  if (!key) return '';
  if (!S3_BASE) return key;

  return `${S3_BASE.replace(/\/+$/, '')}/${String(key).replace(/^\/+/, '')}`;
};

const isPdf = (mimeType?: string, archivo?: string): boolean =>
  (mimeType ?? '').toLowerCase().includes('pdf') || (archivo ?? '').toLowerCase().endsWith('.pdf');

// Tipos (shape parseado que devuelve GET /[folio])
interface TipoRef { id: number; idTipo: number; tipo: string }
interface Evidencia { id: number; idTipo: number; tipo: string; archivo: string; mimeType: string; orden: number }
interface Tarima { id: number; tarimaFoto: string; papeletaFoto: string; orden: number }
interface Documento { nombre: string; archivo: string; mimeType?: string }

interface Sitio {
  id: number;
  idSitio: string;
  nombreSitio: string;
  descripcionMaterial: string;
  materialFaltante: boolean;
  descripcionFaltantes: string | null;
  descripcionIncidencias: string | null;
  tiposMaterial: TipoRef[];
  incidencias: TipoRef[];
  evidencias: Evidencia[];
  tarimas: Tarima[];
}

interface LMDetail {
  Id: number;
  Folio: string;
  IdUsuario: number;
  Fecha: string;
  IdXdock: number;
  Xdock: string;
  NombreResponsable: string | null;
  UnidadPlaca: string;
  NombreOperador: string;
  HoraLlegada: string;
  HoraInicioDescarga: string;
  HoraSalida: string;
  Confirmado: boolean;
  FechaCreacion: string;
  FechaEdicion: string | null;
  RE: boolean;
  IdCarrier: number;
  Carrier: string;
  EsOtro: boolean;
  OtroCarrier: string | null;
  Responsable: string;
  Correo: string;
  documentos: Documento[];
  sitios: Sitio[];
}

// Componentes de presentación

const Field = ({ label, value }: { label: string; value: ReactNode }) => (
  <Grid size={{ xs: 12, sm: 6, md: 4 }}>
    <Typography variant='body2' color='text.secondary'>
      {label}
    </Typography>
    <Typography variant='body1'>{value ?? '—'}</Typography>
  </Grid>
);

const Chips = ({ items, color }: { items: TipoRef[]; color: 'secondary' | 'error' }) =>
  items.length === 0 ? (
    <Typography variant='body2' color='text.secondary'>
      —
    </Typography>
  ) : (
    <div className='flex flex-wrap gap-1'>
      {items.map(t => (
        <Chip key={t.id} size='small' color={color} variant='tonal' label={t.tipo} />
      ))}
    </div>
  );

// Archivo (evidencia o documento): miniatura si es imagen, enlace si es PDF.
const Archivo = ({ label, archivo, mimeType }: { label: string; archivo: string; mimeType?: string }) => {
  const url = photoUrl(archivo);

  return (
    <Grid size={{ xs: 6, md: 3 }}>
      <Typography variant='body2' color='text.secondary' className='mbe-1 truncate' title={label}>
        {label}
      </Typography>
      {!archivo ? (
        <Typography variant='caption' color='text.secondary'>
          Sin archivo
        </Typography>
      ) : isPdf(mimeType, archivo) ? (
        <Button size='small' variant='outlined' color='error' href={url} target='_blank' rel='noreferrer'>
          Ver PDF
        </Button>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <a href={url} target='_blank' rel='noreferrer'>
          <img src={url} alt={label} style={{ width: '100%', borderRadius: 8, objectFit: 'cover', aspectRatio: '4/3' }} />
        </a>
      )}
    </Grid>
  );
};

const TarimaPar = ({ tarima }: { tarima: Tarima }) => (
  <Grid size={{ xs: 12, sm: 6 }}>
    <Typography variant='subtitle2' className='mbe-1'>
      Tarima {tarima.orden ?? tarima.id}
    </Typography>
    <Grid container spacing={2}>
      <Archivo label='Foto tarima' archivo={tarima.tarimaFoto} />
      <Archivo label='Foto papeleta' archivo={tarima.papeletaFoto} />
    </Grid>
  </Grid>
);

const SitioCard = ({ sitio, indice }: { sitio: Sitio; indice: number }) => (
  <Card variant='outlined' className='mbe-4'>
    <CardContent>
      <div className='flex items-center gap-2 mbe-4'>
        <Typography variant='h6'>
          Sitio {indice}: {sitio.nombreSitio}
        </Typography>
        <Chip size='small' variant='tonal' label={sitio.idSitio} />
        {sitio.materialFaltante && <Chip size='small' color='warning' variant='tonal' label='Material faltante' />}
      </div>

      <Grid container spacing={4} className='mbe-4'>
        <Grid size={{ xs: 12, md: 6 }}>
          <Typography variant='body2' color='text.secondary'>
            Descripción del material
          </Typography>
          <Typography variant='body1'>{sitio.descripcionMaterial || '—'}</Typography>
        </Grid>
        {sitio.materialFaltante && (
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant='body2' color='text.secondary'>
              Descripción de faltantes
            </Typography>
            <Typography variant='body1'>{sitio.descripcionFaltantes || '—'}</Typography>
          </Grid>
        )}
        {sitio.descripcionIncidencias && (
          <Grid size={{ xs: 12 }}>
            <Typography variant='body2' color='text.secondary'>
              Descripción de incidencias
            </Typography>
            <Typography variant='body1'>{sitio.descripcionIncidencias}</Typography>
          </Grid>
        )}
      </Grid>

      <Grid container spacing={4} className='mbe-4'>
        <Grid size={{ xs: 12, md: 6 }}>
          <Typography variant='subtitle2' color='text.secondary' className='mbe-1'>
            Tipos de material
          </Typography>
          <Chips items={sitio.tiposMaterial} color='secondary' />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Typography variant='subtitle2' color='text.secondary' className='mbe-1'>
            Incidencias
          </Typography>
          <Chips items={sitio.incidencias} color='error' />
        </Grid>
      </Grid>

      <Typography variant='subtitle2' className='mbe-2'>
        Evidencias ({sitio.evidencias.length})
      </Typography>
      {sitio.evidencias.length === 0 ? (
        <Typography variant='body2' color='text.secondary' className='mbe-4'>
          Sin evidencias
        </Typography>
      ) : (
        <Grid container spacing={3} className='mbe-4'>
          {sitio.evidencias.map(ev => (
            <Archivo key={ev.id} label={ev.tipo || 'Evidencia'} archivo={ev.archivo} mimeType={ev.mimeType} />
          ))}
        </Grid>
      )}

      <Typography variant='subtitle2' className='mbe-2'>
        Tarimas ({sitio.tarimas.length})
      </Typography>
      {sitio.tarimas.length === 0 ? (
        <Typography variant='body2' color='text.secondary'>
          Sin tarimas
        </Typography>
      ) : (
        <Grid container spacing={4}>
          {sitio.tarimas.map(t => (
            <TarimaPar key={t.id} tarima={t} />
          ))}
        </Grid>
      )}
    </CardContent>
  </Card>
);

// Vista principal
const MaterialLogisticsDetail = ({ folio }: { folio: string }) => {
  const router = useRouter();
  const { lang } = useParams();

  const [data, setData] = useState<LMDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/warehouses/material-logistics/${encodeURIComponent(folio)}`, {
          signal: controller.signal,
        });

        if (res.status === 403) throw new Error('No tienes permiso para ver este registro.');
        if (res.status === 404) throw new Error('Registro no encontrado.');
        if (!res.ok) throw new Error('No se pudo cargar el registro.');

        const json = (await res.json()) as LMDetail;

        setData(json);
      } catch (e) {
        if ((e as Error).name !== 'AbortError') setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    };

    load();

    return () => controller.abort();
  }, [folio]);

  const carrierLabel = useMemo(() => {
    if (!data) return '';

    return data.EsOtro ? data.OtroCarrier ?? '' : data.Carrier;
  }, [data]);

  if (loading) {
    return (
      <Card>
        <CardContent className='flex justify-center items-center' style={{ minHeight: 240 }}>
          <CircularProgress />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent>
          <Alert severity='error' className='mbe-4'>
            {error ?? 'Registro no encontrado.'}
          </Alert>
          <Button variant='outlined' onClick={() => router.push(`/${lang}/warehouses/material-logistics`)}>
            Volver al listado
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title={`${data.RE ? 'Recepción' : 'Entrega'} · ${data.Folio}`}
        subheader={`XDOCK ${data.Xdock} · ${data.Fecha}`}
        action={
          <div className='flex gap-2'>
            <Button
              variant='contained'
              onClick={() =>
                window.open(
                  `/${lang}/warehouses/material-logistics/pdf/${encodeURIComponent(data.Folio)}`,
                  '_blank',
                )
              }
            >
              Ver PDF
            </Button>
            <Button variant='outlined' color='secondary' onClick={() => router.push(`/${lang}/warehouses/material-logistics`)}>
              Volver
            </Button>
          </div>
        }
      />
      <CardContent>
        {/* Cabecera */}
        <Grid container spacing={4}>
          <Field label='Folio' value={data.Folio} />
          <Field label='Tipo' value={data.RE ? 'Recepción' : 'Entrega'} />
          <Field label='Fecha' value={data.Fecha} />
          <Field label='XDOCK' value={data.Xdock} />
          <Field label='Responsable' value={data.Responsable} />
          <Field label='Correo' value={data.Correo} />
          <Field label='Unidad / Placa' value={data.UnidadPlaca} />
          <Field label='Operador' value={data.NombreOperador} />
          <Field
            label='Carrier'
            value={
              data.EsOtro ? (
                <>
                  {carrierLabel} <Chip size='small' variant='tonal' label='Fuera de catálogo' />
                </>
              ) : (
                carrierLabel
              )
            }
          />
          <Field label='Llegada de la unidad' value={data.HoraLlegada} />
          <Field label='Inicio de descarga' value={data.HoraInicioDescarga} />
          <Field label='Salida de la unidad' value={data.HoraSalida} />
          <Field
            label='Confirmado'
            value={<Chip size='small' color={data.Confirmado ? 'success' : 'default'} variant='tonal' label={data.Confirmado ? 'Sí' : 'No'} />}
          />
          <Field label='Fecha de captura' value={data.FechaCreacion ? new Date(data.FechaCreacion).toLocaleString('es-MX') : '—'} />
          <Field label='Última edición' value={data.FechaEdicion ? new Date(data.FechaEdicion).toLocaleString('es-MX') : '—'} />
        </Grid>

        {/* Documentos de cabecera */}
        <Divider className='mlb-6' />
        <Typography variant='h6' className='mbe-4'>
          Documentos del arribo ({data.documentos.length})
        </Typography>
        {data.documentos.length === 0 ? (
          <Typography variant='body2' color='text.secondary'>
            Sin documentos generales
          </Typography>
        ) : (
          <Grid container spacing={3}>
            {data.documentos.map((d, i) => (
              <Archivo key={`${d.archivo}-${i}`} label={d.nombre || `Documento ${i + 1}`} archivo={d.archivo} mimeType={d.mimeType} />
            ))}
          </Grid>
        )}

        {/* Sitios */}
        <Divider className='mlb-6' />
        <Typography variant='h6' className='mbe-4'>
          Sitios ({data.sitios.length})
        </Typography>
        {data.sitios.length === 0 ? (
          <Typography variant='body2' color='text.secondary'>
            Sin sitios
          </Typography>
        ) : (
          data.sitios.map((s, i) => <SitioCard key={s.id} sitio={s} indice={i + 1} />)
        )}
      </CardContent>
    </Card>
  );
};

export default MaterialLogisticsDetail;
