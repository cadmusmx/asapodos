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
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';

// Third-party Imports
import { toast } from 'react-toastify';

// Style Imports
import styles from '@core/styles/table.module.css';

import { resolveAssetUrl as photoUrl } from '@/utils/assetUrl';

import FirmaCapture from './components/FirmaCapture';

interface Pieza { id: number; cl: number | string; clt: string; pzs: string }

interface Tarima { n: number; tarima: string | null; papeleta: string | null }

interface VMDetail {
  Id: number; Folio: string; Fecha: string; ES: boolean; Status: number; Cancelada: boolean;
  Responsable: string; Proyecto: string; TipoMaterial: string; AlmacenDestino: string; Carrier: string;
  OtroCarrier: string | null; NombreSitio: string; IdSitio: string; CuentaCliente: string;
  AspNombre: string; AspFirma: string | null; NombreContacto: string; IdRegion: number;
  TotalPiezas: number; NumTarimas: number; Tarimas: string; PlacasTransporte: string; Notas: string | null; Qr: string;
  MaterialEnTransporteFoto: string; MaterialDescargadoFoto: string | null; TransporteFoto: string; PlacasFoto: string;
  MaterialDocumentos: string | null; UsuarioEditor: string | null; Vinculado: number | null;
  FechaCaptura: string; FechaEdicion: string | null;
  PiezasMotivo: string; PiezasEstadoF: string;
}

function parsePiezas(json: unknown): Pieza[] {
  if (typeof json !== 'string' || !json) return [];

  try {
    const arr = JSON.parse(json);

    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
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
);

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
);

const ReadonlyFoto = ({ label, url }: { label: string; url: string }) => (
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

// Foto capturable: sube por documents?flow=out con nombre semántico, guarda la key.
const CapturePhoto = ({ label, name, value, onChange }: {
  label: string; name: string; value: string; onChange: (key: string) => void;
}) => {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    e.target.value = '';
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('La imagen excede 10 MB');

      return;
    }

    setBusy(true);

    try {
      const fd = new FormData();

      fd.append('file', file);
      fd.append('name', name);

      const res = await fetch('/api/warehouses/material-validation/documents?flow=out', { method: 'POST', body: fd });

      if (!res.ok) {
        const { message } = await res.json().catch(() => ({ message: 'Error al subir la foto' }));

        throw new Error(message);
      }

      const { key } = await res.json();

      onChange(key);
      toast.success(`${label} subida`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Grid size={{ xs: 12, sm: 4 }}>
      <Typography variant='body2' color='text.secondary' className='mbe-1'>{label} *</Typography>
      {value ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl(value)} alt={label} style={{ width: '100%', borderRadius: 8, objectFit: 'cover', aspectRatio: '4/3' }} />
      ) : (
        <Box sx={{ aspectRatio: '4/3', border: '1px dashed', borderColor: 'divider', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography variant='caption' color='text.secondary'>Sin foto</Typography>
        </Box>
      )}
      <input ref={ref} type='file' accept='.jpg,.jpeg,.png' hidden onChange={onFile} />
      <Button size='small' variant='outlined' disabled={busy} onClick={() => ref.current?.click()} className='mbs-2'>
        {busy ? 'Subiendo…' : value ? 'Reemplazar' : 'Subir'}
      </Button>
    </Grid>
  );
};

const MaterialValidationOut = ({ folio }: { folio: string }) => {
  const router = useRouter();
  const { lang } = useParams();
  const accordionId = useId();

  const [data, setData] = useState<VMDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Datos generales capturados en la salida.
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [aspNombre, setAspNombre] = useState('');
  const [firma, setFirma] = useState('');
  const [nombreContacto, setNombreContacto] = useState('');
  const [placas, setPlacas] = useState('');
  const [notas, setNotas] = useState('');
  const [fotos, setFotos] = useState({ fotoMaterialTransporte: '', fotoTransporte: '', fotoPlacas: '' });

  // Documentos: heredados del IN (solo lectura) + nuevos (opcionales, removibles).
  const inheritedDocs = useMemo(() => parseDocs(data?.MaterialDocumentos), [data]);
  const [newDocs, setNewDocs] = useState<Array<{ name: string; file: string }>>([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const docInputRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);

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

        const detail = (await res.json()) as VMDetail;

        if (!detail.ES) throw new Error('El folio no es una entrada (IN); no se puede generar salida desde él.');

        setData(detail);
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
        setError((e as Error).message);
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    load();

    return () => controller.abort();
  }, [folio]);

  const piezasMotivo = useMemo(() => parsePiezas(data?.PiezasMotivo), [data]);
  const piezasEstadoF = useMemo(() => parsePiezas(data?.PiezasEstadoF), [data]);
  const tarimas = useMemo(() => parseTarimas(data?.Tarimas), [data]);

  const onDocSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    e.target.value = '';
    if (!file) return;

    setUploadingDoc(true);

    try {
      const fd = new FormData();

      fd.append('file', file);

      const res = await fetch('/api/warehouses/material-validation/documents?flow=out', { method: 'POST', body: fd });

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

  const submit = async () => {
    if (!fecha || !aspNombre.trim() || !firma || !nombreContacto.trim() || !placas.trim()
      || !fotos.fotoMaterialTransporte || !fotos.fotoTransporte || !fotos.fotoPlacas) {
      toast.error('Completa los requeridos: fecha, ASP, firma, contacto, placas y las 3 fotos.');

      return;
    }

    setSaving(true);

    try {
      const body = {
        folioIn: folio, // el server genera el folioOut (QR heredado)
        fecha,
        aspNombre: aspNombre.trim(),
        firmaBase64: firma,
        nombreContacto: nombreContacto.trim(),
        placasTransporte: placas.trim(),
        fotoMaterialTransporte: fotos.fotoMaterialTransporte,
        fotoTransporte: fotos.fotoTransporte,
        fotoPlacas: fotos.fotoPlacas,
        notas: notas.trim() || undefined,
        materialDocumentos: JSON.stringify([...inheritedDocs, ...newDocs]),
      };

      const res = await fetch('/api/warehouses/material-validation/out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.status === 409) throw new Error('Este folio IN ya tiene una salida.');
      if (res.status === 404) throw new Error('El folio IN no es válido.');
      if (res.status === 403) throw new Error('No tienes permiso para crear la salida.');

      if (!res.ok) {
        const { message } = await res.json().catch(() => ({ message: 'No se pudo crear la salida.' }));

        throw new Error(message);
      }

      const { folioOut } = await res.json();

      toast.success(`Salida creada: ${folioOut}`);
      router.push(`/${lang}/warehouses/material-validation/${encodeURIComponent(folioOut)}`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

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
          <div className='flex items-center gap-2 flex-wrap'>
            <span>Nueva salida</span>
            <Chip size='small' variant='tonal' color='info' label={`desde ${data.Folio}`} />
          </div>
        }
      />
      <CardContent>
        {/* ── Material heredado del IN (solo lectura) ── */}
        <Typography variant='h6' className='mbe-4'>Datos heredados de la entrada (solo lectura)</Typography>
        <Grid container spacing={4} className='mbe-2'>
          <Field label='Proyecto' value={data.Proyecto} />
          <Field label='Tipo de material' value={data.TipoMaterial} />
          <Field label='Almacén destino' value={data.AlmacenDestino} />
          <Field label='Sitio' value={data.NombreSitio} />
          <Field label='ID sitio' value={data.IdSitio} />
          <Field label='Cuenta cliente' value={data.CuentaCliente} />
          <Field label='Carrier' value={carrier} />
          <Field label='Total piezas' value={data.TotalPiezas} />
          <Field label='Tarimas' value={data.NumTarimas} />
        </Grid>

        <Accordion>
          <AccordionSummary aria-controls={`${accordionId}-parts-content`} id={`${accordionId}-parts-header`}>
            <Typography variant='subtitle1'>Piezas</Typography>
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
            <AccordionSummary aria-controls={`${accordionId}-pallets-content`} id={`${accordionId}-pallets-header`}>
              <Typography variant='subtitle1'>Tarimas ({data.NumTarimas})</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={4}>
                {tarimas.map(t => (
                  <Grid key={t.n} size={{ xs: 12, md: 6 }}>
                    <Typography variant='subtitle2' className='mbe-2'>Tarima {t.n}</Typography>
                    <Grid container spacing={4}>
                      <ReadonlyFoto label='Tarima' url={photoUrl(t.tarima)} />
                      <ReadonlyFoto label='Papeleta' url={photoUrl(t.papeleta)} />
                    </Grid>
                  </Grid>
                ))}
              </Grid>
            </AccordionDetails>
          </Accordion>
        )}

        <Divider className='mlb-6' />

        {/* ── Datos de la salida (captura) ── */}
        <Typography variant='h6' className='mbe-4'>Datos de la salida</Typography>
        <Grid container spacing={4} className='mbe-4'>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField label='Fecha *' type='date' fullWidth value={fecha}
              onChange={e => setFecha(e.target.value)} InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField label='Nombre ASP *' fullWidth value={aspNombre} onChange={e => setAspNombre(e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField label='Nombre contacto *' fullWidth value={nombreContacto} onChange={e => setNombreContacto(e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField label='Placas transporte *' fullWidth value={placas} onChange={e => setPlacas(e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField label='Notas' fullWidth multiline minRows={2} value={notas} onChange={e => setNotas(e.target.value)} />
          </Grid>
        </Grid>

        <Typography variant='subtitle1' className='mbe-2'>Firma ASP *</Typography>
        <FirmaCapture value={firma} onChange={setFirma} />

        <Divider className='mlb-6' />

        <Typography variant='subtitle1' className='mbe-3'>Evidencia fotográfica</Typography>
        <Grid container spacing={4}>
          <CapturePhoto label='Material en transporte' name='foto_material_transporte'
            value={fotos.fotoMaterialTransporte} onChange={k => setFotos(p => ({ ...p, fotoMaterialTransporte: k }))} />
          <CapturePhoto label='Transporte' name='foto_transporte'
            value={fotos.fotoTransporte} onChange={k => setFotos(p => ({ ...p, fotoTransporte: k }))} />
          <CapturePhoto label='Placas' name='foto_placas'
            value={fotos.fotoPlacas} onChange={k => setFotos(p => ({ ...p, fotoPlacas: k }))} />
        </Grid>

        <Divider className='mlb-6' />

        {/* ── Documentos: heredados (solo lectura) + nuevos ── */}
        <Typography variant='subtitle1' className='mbe-3'>Documentos</Typography>
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

        <div className='flex items-center gap-3'>
          <Button variant='contained' disabled={saving} onClick={submit}>
            {saving ? 'Generando…' : 'Generar salida'}
          </Button>
          <Button variant='outlined' color='secondary' disabled={saving}
            onClick={() => router.push(`/${lang}/warehouses/material-validation`)}>
            Cancelar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default MaterialValidationOut;
