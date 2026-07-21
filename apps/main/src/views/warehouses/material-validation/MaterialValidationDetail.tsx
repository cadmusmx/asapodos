'use client';

// React Imports
import { useEffect, useMemo, useState } from 'react';

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

// Style Imports
import styles from '@core/styles/table.module.css';

// Base pública de S3 para construir URLs de fotos/QR/documentos (llaves en BD).
const S3_BASE = process.env.NEXT_PUBLIC_S3_PUBLIC_BASE_URL ?? '';

interface Pieza { id: number; cl: number | string; clt: string; pzs: string };

interface VMDetail {
  Id: number; Folio: string; Fecha: string; ES: boolean; Status: number; Cancelada: boolean;
  Responsable: string; Proyecto: string; TipoMaterial: string; AlmacenDestino: string; Carrier: string;
  OtroCarrier: string | null; NombreSitio: string; IdSitio: string; CuentaCliente: string;
  AspNombre: string; AspFirma: string | null; NombreContacto: string; IdRegion: number;
  TotalPiezas: number; NumTarimas: number; PlacasTransporte: string; Notas: string | null; Qr: string;
  MaterialEnTransporteFoto: string; MaterialDescargadoFoto: string | null; TransporteFoto: string; PlacasFoto: string;
  MaterialDocumentos: string | null; UsuarioEditor: string | null; Vinculado: number | null;
  FechaCaptura: string; FechaEdicion: string | null;
  PiezasMotivo: string; PiezasEstadoF: string;
}

const photoUrl = (key?: string | null): string => {
  if (!key) return ''
  if (!S3_BASE) return key

  return `${S3_BASE.replace(/\/+$/, '')}/${String(key).replace(/^\/+/, '')}`
}

const firmaSrc = (f?: string | null): string =>
  !f ? '' : f.startsWith('data:') ? f : `data:image/png;base64,${f}`

function parsePiezas(json: unknown): Pieza[] {
  if (typeof json !== 'string' || !json) return []

  try {
    const arr = JSON.parse(json)

    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

function parseDocs(json: unknown): Array<{ name: string; file: string }> {
  if (typeof json !== 'string' || !json) return [];

  try {
    const arr = JSON.parse(json);

    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

// Campo etiqueta/valor de solo lectura
const Field = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <Grid size={{ xs: 12, sm: 6, md: 4 }}>
    <Typography variant='body2' color='text.secondary'>{label}</Typography>
    <Typography variant='body1'>{value ?? '—'}</Typography>
  </Grid>
)

const PiezasTable = ({ titulo, piezas, claveLabel }: { titulo: string; piezas: Pieza[]; claveLabel: string }) => (
  <>
    <Typography variant='subtitle2' className='mbe-2'>{titulo}</Typography>
    {piezas.length === 0 ? (
      <Typography variant='body2' color='text.secondary' className='mbe-4'>Sin piezas</Typography>
    ) : (
      <div className='overflow-x-auto mbe-4'>
        <table className={styles.table}>
          <thead><tr><th>{claveLabel}</th><th>Piezas</th></tr></thead>
          <tbody>
            {piezas.map(p => <tr key={p.id}><td>{p.clt}</td><td>{p.pzs}</td></tr>)}
          </tbody>
        </table>
      </div>
    )}
  </>
)

const Foto = ({ label, url }: { label: string; url: string }) => (
  <Grid size={{ xs: 6, md: 3 }}>
    <Typography variant='body2' color='text.secondary' className='mbe-1'>{label}</Typography>
    {url ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt={label} style={{ width: '100%', borderRadius: 8, objectFit: 'cover', aspectRatio: '4/3' }} />
    ) : (
      <Typography variant='caption' color='text.secondary'>Sin imagen</Typography>
    )}
  </Grid>
);

const MaterialValidationDetail = ({ folio, canEdit }: { folio: string; canEdit: boolean }) => {
  const router = useRouter();
  const { lang } = useParams();

  const [data, setData] = useState<VMDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(
          `/api/warehouses/material-validation/${encodeURIComponent(folio)}`,
          { signal: controller.signal },
        );

        if (res.status === 403) throw new Error('No tienes permiso para ver este registro.');
        if (res.status === 404) throw new Error('Registro no encontrado.');
        if (!res.ok) throw new Error('No se pudo cargar el registro.');
        const data = await res.json();

        setData(data);
        setLoading(false);
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
        setError((e as Error).message);
        setData(null);
      }
    }

    load();

    return () => controller.abort();
  }, [folio])

  const piezasMotivo = useMemo(() => parsePiezas(data?.PiezasMotivo), [data]);
  const piezasEstadoF = useMemo(() => parsePiezas(data?.PiezasEstadoF), [data]);
  const documentos = useMemo(() => parseDocs(data?.MaterialDocumentos), [data]);

  if (loading) {
    return (
      <Card><CardContent>
        <div className='flex items-center justify-center min-bs-[240px]'><CircularProgress /></div>
      </CardContent></Card>
    );
  }

  if (error || !data) {
    return (
      <Card><CardContent>
        <Alert severity='error' className='mbe-4'>{error ?? 'Sin datos'}</Alert>
        <Button variant='outlined' color='secondary' onClick={() => router.push(`/${lang}/warehouses/material-validation`)}>
          Volver al listado
        </Button>
      </CardContent></Card>
    );
  }

  const carrier = data.Carrier + (data.OtroCarrier ? ` (${data.OtroCarrier})` : '');

  return (
    <Card>
      <CardHeader
        title={
          <div className='flex items-center gap-2'>
            <span>{data.Folio}</span>
            <Chip size='small' variant='tonal' color={data.ES ? 'info' : 'secondary'} label={data.ES ? 'Entrada' : 'Salida'} />
            <Chip size='small' variant='tonal' color={data.Status === 0 ? 'warning' : 'success'} label={data.Status === 0 ? 'Pendiente' : 'Revisado'} />
            {data.Cancelada && <Chip size='small' variant='tonal' color='error' label='Cancelada' />}
            {data.Vinculado && <Chip size='small' variant='tonal' color='info' label='Vinculado' />}
          </div>
        }
        action={
          <div className='flex gap-2'>
            <Button variant='outlined' color='secondary' onClick={() => router.push(`/${lang}/warehouses/material-validation`)}>Volver</Button>
            {canEdit && data.Status === 0 && (
              <Button variant='contained' startIcon={<i className='ri-edit-line' />}
                onClick={() => router.push(`/${lang}/warehouses/material-validation/${encodeURIComponent(folio)}/editar`)}>
                Editar
              </Button>
            )}
          </div>
        }
      />
      <CardContent>
        {/* Datos generales */}
        <Grid container spacing={4}>
          <Field label='Fecha' value={new Date(data.Fecha).toLocaleString()} />
          <Field label='Proyecto' value={data.Proyecto} />
          <Field label='Tipo de material' value={data.TipoMaterial} />
          <Field label='Carrier' value={carrier} />
          <Field label='Almacén destino' value={data.AlmacenDestino} />
          <Field label='Región' value={`R ${data.IdRegion}`} />
          <Field label='Nombre del sitio' value={data.NombreSitio} />
          <Field label='ID del sitio' value={data.IdSitio} />
          <Field label='Cuenta cliente' value={data.CuentaCliente} />
          <Field label='ASP' value={data.AspNombre} />
          <Field label='Contacto' value={data.NombreContacto} />
          <Field label='Placas transporte' value={data.PlacasTransporte} />
          <Field label='Total piezas' value={data.TotalPiezas} />
          <Field label='Tarimas' value={data.NumTarimas} />
          <Field label='Responsable' value={data.Responsable} />
          <Field label='Editor web' value={data.UsuarioEditor} />
          <Field label='Capturado' value={new Date(data.FechaCaptura).toLocaleString()} />
          <Field label='Editado' value={data.FechaEdicion ? new Date(data.FechaEdicion).toLocaleString() : '—'} />
          <Field label='Notas' value={data.Notas} />
        </Grid>

        <Divider className='mlb-6' />

        {/* Fotos */}
        <Typography variant='h6' className='mbe-4'>Evidencia fotográfica</Typography>
        <Grid container spacing={4}>
          <Foto label='Material en transporte' url={photoUrl(data.MaterialEnTransporteFoto)} />
          <Foto label='Transporte' url={photoUrl(data.TransporteFoto)} />
          <Foto label='Placas' url={photoUrl(data.PlacasFoto)} />
          {data.ES && <Foto label='Material descargado' url={photoUrl(data.MaterialDescargadoFoto)} />}
        </Grid>

        <Divider className='mlb-6' />

        {/* Piezas */}
        <Typography variant='h6' className='mbe-4'>Piezas</Typography>
        <Grid container spacing={6}>
          <Grid size={{ xs: 12, md: 6 }}>
            <PiezasTable titulo='Por motivo' piezas={piezasMotivo} claveLabel='Motivo' />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <PiezasTable titulo='Por estado físico' piezas={piezasEstadoF} claveLabel='Estado físico' />
          </Grid>
        </Grid>

        {documentos.length > 0 && (
          <>
            <Divider className='mlb-6' />
            <Typography variant='h6' className='mbe-4'>Documentos</Typography>
            <div className='flex flex-col gap-1'>
              {documentos.map((d, i) => (
                <a key={i} href={photoUrl(d.file)} target='_blank' rel='noreferrer'>{d.name || `Documento ${i + 1}`}</a>
              ))}
            </div>
          </>
        )}

        <Divider className='mlb-6' />

        <Grid container spacing={6}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant='h6' className='mbe-4'>Firma ({data.AspNombre})</Typography>
            {firmaSrc(data.AspFirma) ? (
              <div style={{ width: '60%', padding: '1em', borderRadius: 8, backgroundColor: '#FFF' }}>
                <img src={firmaSrc(data.AspFirma)} alt='Firma' style={{ width: '100%', minWidth: 300 }} />
              </div>
            ) : (
              <Typography variant='body2' color='text.secondary'>Sin firma</Typography>
            )}
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant='h6' className='mbe-4'>Código QR</Typography>
            {data.Qr && (
              <div style={{ width: '40%', padding: '1em', borderRadius: 8, backgroundColor: '#FFF' }}>
                <img src={photoUrl(data.Qr)} alt='QR' style={{ width: '100%', minWidth: 200 }} />
              </div>
            )}
          </Grid>
        </Grid>

      </CardContent>
    </Card>
  );
}

export default MaterialValidationDetail;
