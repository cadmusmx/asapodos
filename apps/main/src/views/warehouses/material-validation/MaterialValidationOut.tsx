'use client';

// React Imports
import { useId, useEffect, useMemo, useState, useRef } from 'react';

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
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';

// Style Imports
import { IconButton } from '@mui/material';
import { toast } from 'react-toastify';

import styles from '@core/styles/table.module.css';

// Base pública de S3 para construir URLs de fotos/QR/documentos (llaves en BD).
const S3_BASE = process.env.NEXT_PUBLIC_S3_PUBLIC_BASE_URL ?? '';

interface Pieza { id: number; cl: number | string; clt: string; pzs: string };

interface Tarima { n: number; tarima: string | null; papeleta: string | null }

interface VMDetail {
  Id: number; Folio: string; Fecha: string; ES: boolean; Status: number; Cancelada: boolean;
  Responsable: string; Proyecto: string; TipoMaterial: string; AlmacenDestino: string; Carrier: string;
  OtroCarrier: string | null; NombreSitio: string; IdSitio: string; CuentaCliente: string;
  AspNombre: string; AspFirma: string | null; NombreContacto: string; IdRegion: number;
  TotalPiezas: number; NumTarimas: number; Tarimas: Tarima; PlacasTransporte: string; Notas: string | null; Qr: string;
  MaterialEnTransporteFoto: string; MaterialDescargadoFoto: string | null; TransporteFoto: string; PlacasFoto: string;
  MaterialDocumentos: string | null; UsuarioEditor: string | null; Vinculado: number | null;
  FechaCaptura: string; FechaEdicion: string | null;
  PiezasMotivo: string; PiezasEstadoF: string;
}

const photoUrl = (key?: string | null): string => {
  if (!key) return '';
  if (/^https?:\/\//i.test(key)) return key;        // ya es absoluta (algunos docs)
  if (!S3_BASE) return key;

  return `${S3_BASE.replace(/\/+$/, '')}/${String(key).replace(/^\/+/, '')}`;
};

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

function parseTarimas(json: unknown): Tarima[] {
  if (typeof json !== 'string' || !json) return [];

  try {
    const obj = JSON.parse(json) as Record<string, string>;
    const nums = new Set<number>();

    for (const k of Object.keys(obj)) {
      const m = k.match(/_(\d+)$/);

      if (m) nums.add(Number(m[1]));
    }

    return [...nums].sort((a, b) => a - b).map(n => ({
      n,
      tarima: obj[`tarima_${n}`] ?? null,
      papeleta: obj[`papeleta_${n}`] ?? null,
    }));
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

const MaterialValidationOut = ({ folio }: { folio: string }) => {
  const router = useRouter();
  const { lang } = useParams();

  const [data, setData] = useState<VMDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const accordionId = useId();
  const inheritedDocs = useMemo(() => parseDocs(data?.MaterialDocumentos), [data]);
  const [newDocs, setNewDocs] = useState<Array<{ name: string; file: string }>>([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const docInputRef = useRef<HTMLInputElement>(null);

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
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
        setError((e as Error).message);
        setData(null);
      } finally {
        setTimeout(() => setLoading(false), 1000);
      }
    }

    load();

    return () => controller.abort();
  }, [folio])

  const piezasMotivo = useMemo(() => parsePiezas(data?.PiezasMotivo), [data]);
  const piezasEstadoF = useMemo(() => parsePiezas(data?.PiezasEstadoF), [data]);
  const tarimas = useMemo(() => parseTarimas(data?.Tarimas), [data]);

  const onDocSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    e.target.value = ''; // permite re-seleccionar el mismo archivo
    if (!file) return;
    setUploadingDoc(true);

    try {
      const fd = new FormData();

      fd.append('file', file);
      const res = await fetch('/api/warehouses/material-validation/documents', { method: 'POST', body: fd });

      if (!res.ok) {
        const { message } = await res.json().catch(() => ({ message: 'Error al subir el documento' }));

        throw new Error(message);
      }

      const { key } = await res.json();

      setNewDocs(prev => [...prev, { name: file.name, file: key }]);
      toast.success('Documento agregado');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploadingDoc(false);
    }
  };

  const removeNewDoc = (i: number) => setNewDocs(prev => prev.filter((_, idx) => idx !== i));

  // al enviar el OUT:
  //   materialDocumentos: JSON.stringify([...inheritedDocs, ...newDocs])

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
            <span>FOLIO DE ENTRADA: {data.Folio}</span>
            {data.Cancelada && <Chip size='small' variant='tonal' color='error' label='Cancelada' />}
            {data.Vinculado && <Chip size='small' variant='tonal' color='info' label='Vinculado' />}
          </div>
        }
      />
      <CardContent>
        {/* Datos generales */}
        <Grid container spacing={4}>
          <Field label='Fecha' value={new Date(data.Fecha).toLocaleString()} /> {/* CAPTURAR */}
          <Field label='Proyecto' value={data.Proyecto} />
          <Field label='Tipo de material' value={data.TipoMaterial} />
          <Field label='Carrier' value={carrier} />
          <Field label='Almacén destino' value={data.AlmacenDestino} />
          <Field label='Región' value={`R ${data.IdRegion}`} />
          <Field label='Nombre del sitio' value={data.NombreSitio} />
          <Field label='ID del sitio' value={data.IdSitio} />
          <Field label='Cuenta cliente' value={data.CuentaCliente} />
          <Field label='ASP' value={data.AspNombre} /> {/* CAPTURAR */}
          <Field label='Contacto' value={data.NombreContacto} /> {/* CAPTURAR */}
          <Field label='Placas transporte' value={data.PlacasTransporte} /> {/* CAPTURAR */}
          <Field label='Total piezas' value={data.TotalPiezas} />
          <Field label='Tarimas' value={data.NumTarimas} />
          <Field label='Responsable' value={data.Responsable} /> {/* SE TOMA DEL USUARIO EN SESION O CAPTURAR */}
          <Field label='Notas' value={data.Notas} /> {/* CAPTURAR OPCIONAL */}
        </Grid>

        {/* Fotos */}
        <Typography variant='h6' className='mbe-4'>Evidencia fotográfica</Typography>
        <Grid container spacing={4}>
          <Foto label='Material en transporte' url={photoUrl(data.MaterialEnTransporteFoto)} /> {/* CAPTURAR */}
          <Foto label='Transporte' url={photoUrl(data.TransporteFoto)} /> {/* CAPTURAR */}
          <Foto label='Placas' url={photoUrl(data.PlacasFoto)} /> {/* CAPTURAR */}
        </Grid>

        <Typography variant='h6' className='mbe-4'>Documentos</Typography>

        {inheritedDocs.length > 0 && (
          <div className='flex flex-col gap-1 mbe-3'>
            {inheritedDocs.map((d, i) => (
              <a key={`in-${i}`} href={photoUrl(d.file)} target='_blank' rel='noreferrer'>
                {d.name || `Documento ${i + 1}`}{' '}
                <Typography component='span' variant='caption' color='text.secondary'>(del IN)</Typography>
              </a>
            ))}
          </div>
        )}

        {newDocs.map((d, i) => (
          <div key={`new-${i}`} className='flex items-center gap-2 mbe-1'>
            <a href={photoUrl(d.file)} target='_blank' rel='noreferrer'>{d.name}</a>
            <IconButton size='small' color='error' onClick={() => removeNewDoc(i)}>
              <i className='ri-close-line' />
            </IconButton>
          </div>
        ))}

        <input ref={docInputRef} type='file' accept='.jpg,.jpeg,.png,.pdf' hidden onChange={onDocSelected} />
        <Button variant='outlined' size='small' disabled={uploadingDoc}
          onClick={() => docInputRef.current?.click()} className='mbs-2'
          startIcon={<i className='ri-upload-2-line' />}>
          {uploadingDoc ? 'Subiendo…' : 'Agregar documento'}
        </Button>

        <Divider className='mlb-6' />

        {/* Piezas */}
        <Accordion>
          <AccordionSummary
            aria-controls={`${accordionId}-parts-content`}
            id={`${accordionId}-parts-header`}
          >
            <Typography variant='h6' className='mbe-4'>Piezas</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={6}>
              <Grid size={{ xs: 12, md: 6 }}>
                <PiezasTable titulo='Por motivo' piezas={piezasMotivo} claveLabel='Motivo' />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <PiezasTable titulo='Por estado físico' piezas={piezasEstadoF} claveLabel='Estado físico' />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {tarimas.length > 0 && (
          <Accordion>
            <AccordionSummary
              aria-controls={`${accordionId}-pallets-content`}
              id={`${accordionId}-pallets-header`}
            >
              <Typography variant='h6' className='mbe-4'>Tarimas ({data.NumTarimas})</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={4}>
                {tarimas.map(t => (
                  <Grid key={t.n} size={{ xs: 12, md: 6 }}>
                    <Typography variant='subtitle2' className='mbe-2'>Tarima {t.n}</Typography>
                    <Grid container spacing={4}>
                      <Foto label='Tarima' url={photoUrl(t.tarima)} />
                      <Foto label='Papeleta' url={photoUrl(t.papeleta)} />
                    </Grid>
                  </Grid>
                ))}
              </Grid>
            </AccordionDetails>
          </Accordion>
        )}

        <Divider className='mlb-6' />

        {/* CAPTURAR FIRMA (NUEVA DEPENDENCIA?) */}
        <Grid container spacing={6}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant='h6' className='mbe-4'>Firma - ({data.AspNombre})</Typography>
            {firmaSrc(data.AspFirma) ? (
              <div style={{ width: '60%', padding: '1em', borderRadius: 8, backgroundColor: '#FFF' }}>
                <img src={firmaSrc(data.AspFirma)} alt='Firma' style={{ width: '100%', minWidth: 300 }} />
              </div>
            ) : (
              <Typography variant='body2' color='text.secondary'>Sin firma</Typography>
            )}
          </Grid>
        </Grid>

      </CardContent>
    </Card>
  );
}

export default MaterialValidationOut;
