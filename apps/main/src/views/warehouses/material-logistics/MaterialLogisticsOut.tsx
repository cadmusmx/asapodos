'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { useParams, useRouter } from 'next/navigation';

import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid2';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { toast } from 'react-toastify';

// Tipos del detalle (solo lo que usa el form)
interface DocItem {
  nombre: string;
  archivo: string;
  mimeType: string;
}
interface SitioTipo {
  id: number;
  tipo: string;
}
interface SitioIncidencia {
  id: number;
  tipo: string;
}
interface SitioEvidencia {
  id: number;
  tipo: string;
  archivo: string;
}
interface SitioTarima {
  id: number;
  tarimaFoto: string;
  papeletaFoto: string;
}
interface SitioDetalle {
  id: number;
  idSitio: string;
  nombreSitio: string;
  descripcionMaterial: string | null;
  materialFaltante: boolean;
  descripcionIncidencias: string | null;
  entregado: boolean;
  folioEntrega: string | null;
  tiposMaterial: SitioTipo[];
  incidencias: SitioIncidencia[];
  evidencias: SitioEvidencia[];
  tarimas: SitioTarima[];
}
interface LMDetail {
  Folio: string;
  RE: boolean;
  Xdock: string;
  Carrier: string;
  EsOtro: boolean;
  OtroCarrier: string | null;
  sitios: SitioDetalle[];
  documentos: DocItem[];
}

// Key S3 → URL. Si ya es absoluta (http, docs migrados de otro bucket) se usa tal cual.
const assetUrl = (v?: string): string => {
  const s = (v ?? '').trim();

  if (!s) return '';
  if (/^https?:\/\//i.test(s)) return s;

  const base = process.env.NEXT_PUBLIC_S3_PUBLIC_BASE_URL ?? '';

  return base ? `${base.replace(/\/+$/, '')}/${s.replace(/^\/+/, '')}` : s;
};

// Enlace a archivo (nueva pestaña). No renderiza imagen (regla acordada).
const FileLink = ({ href, label }: { href: string; label: string }) =>
  href ? (
    <Button
      size='small'
      variant='text'
      startIcon={<i className='ri-attachment-2' />}
      component='a'
      href={assetUrl(href)}
      target='_blank'
      rel='noopener noreferrer'
    >
      {label}
    </Button>
  ) : null;

const carrierLabel = (d: LMDetail): string => (d.EsOtro ? d.OtroCarrier ?? '' : d.Carrier);

const MaterialLogisticsOut = ({ folio }: { folio: string }) => {
  const router = useRouter();
  const { lang } = useParams();

  const [data, setData] = useState<LMDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Generales capturados (en blanco; no se heredan del IN).
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [nombreResponsable, setNombreResponsable] = useState('');
  const [unidadPlaca, setUnidadPlaca] = useState('');
  const [nombreOperador, setNombreOperador] = useState('');
  const [horaLlegada, setHoraLlegada] = useState('');
  const [horaInicioDescarga, setHoraInicioDescarga] = useState(''); // rotulado "inicio de carga"
  const [horaSalida, setHoraSalida] = useState('');
  const [confirmado, setConfirmado] = useState(false);

  // Sitios seleccionados (Ids de GASOAL_LMSitios pendientes).
  const [selected, setSelected] = useState<number[]>([]);

  // Documentos: heredados del IN (read-only) + nuevos (removibles).
  const inheritedDocs = useMemo(() => data?.documentos ?? [], [data]);
  const [newDocs, setNewDocs] = useState<DocItem[]>([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const docInputRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);

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
        if (res.status === 404) throw new Error('Recepción no encontrada.');
        if (!res.ok) throw new Error('No se pudo cargar la recepción.');

        const detail = (await res.json()) as LMDetail;

        if (!detail.RE) throw new Error('El folio no es una recepción; no se puede entregar desde él.');

        if (!detail.sitios.some(s => !s.entregado)) {
          throw new Error('Esta recepción ya fue entregada por completo.');
        }

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

  const pendientes = useMemo(() => data?.sitios.filter(s => !s.entregado) ?? [], [data]);
  const entregados = useMemo(() => data?.sitios.filter(s => s.entregado) ?? [], [data]);

  const toggleSitio = (id: number) =>
    setSelected(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));

  const onDocSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    e.target.value = '';
    if (!file) return;

    setUploadingDoc(true);

    try {
      const fd = new FormData();

      fd.append('file', file);

      const res = await fetch('/api/warehouses/material-logistics/documents?flow=out', {
        method: 'POST',
        body: fd,
      });

      if (!res.ok) {
        const { message } = await res.json().catch(() => ({ message: 'Error al subir el documento' }));

        throw new Error(message);
      }

      const { key } = await res.json();

      setNewDocs(prev => [...prev, { nombre: file.name, archivo: key, mimeType: file.type }]);
      toast.success('Documento agregado');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploadingDoc(false);
    }
  };

  const removeNewDoc = (i: number) => setNewDocs(prev => prev.filter((_, idx) => idx !== i));

  const submit = async () => {
    if (selected.length === 0) {
      toast.error('Selecciona al menos un sitio a entregar.');

      return;
    }

    if (!fecha || !unidadPlaca.trim() || !nombreOperador.trim() || !horaLlegada || !horaInicioDescarga || !horaSalida) {
      toast.error('Completa los requeridos: fecha, unidad/placa, operador y las 3 horas.');

      return;
    }

    setSaving(true);

    try {
      const body = {
        folioIn: folio, // el server genera el folioOut (LME-) y hereda el Qr del IN
        sitios: selected,
        fecha,
        nombreResponsable: nombreResponsable.trim() || undefined,
        unidadPlaca: unidadPlaca.trim(),
        nombreOperador: nombreOperador.trim(),
        horaLlegada,
        horaInicioDescarga,
        horaSalida,
        confirmado,
        documentos: [...inheritedDocs, ...newDocs], // merge (array, no string)
      };

      const res = await fetch('/api/warehouses/material-logistics/out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.status === 409) throw new Error('Uno o más sitios ya fueron entregados. Actualiza y reintenta.');
      if (res.status === 404) throw new Error('La recepción de origen no es válida.');
      if (res.status === 403) throw new Error('No tienes permiso para crear la entrega.');

      if (!res.ok) {
        const { message } = await res.json().catch(() => ({ message: 'No se pudo crear la entrega.' }));

        throw new Error(message);
      }

      const { folioOut } = await res.json();

      toast.success(`Entrega creada: ${folioOut}`);
      router.push(`/${lang}/warehouses/material-logistics/${encodeURIComponent(folioOut)}`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <div className='flex items-center justify-center min-bs-[240px]'>
            <CircularProgress />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent>
          <Alert severity='error'>{error ?? 'No se pudo cargar la recepción.'}</Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title={`Entrega desde ${data.Folio}`}
        subheader={`XDOCK: ${data.Xdock} · Carrier: ${carrierLabel(data)}`}
      />
      <CardContent className='flex flex-col gap-6'>
        {/* --- Sitios a entregar --- */}
        <div>
          <Typography variant='subtitle1' className='mbe-2'>
            Sitios a entregar ({selected.length}/{pendientes.length})
          </Typography>

          {pendientes.map(s => (
            <Accordion key={s.id} disableGutters>
              <AccordionSummary expandIcon={<i className='ri-arrow-down-s-line' />}>
                <FormControlLabel
                  onClick={e => e.stopPropagation()}
                  control={
                    <Checkbox checked={selected.includes(s.id)} onChange={() => toggleSitio(s.id)} />
                  }
                  label={
                    <span className='flex items-center gap-2'>
                      {s.nombreSitio}
                      <Typography variant='caption' color='text.secondary'>
                        ({s.idSitio})
                      </Typography>
                      {s.materialFaltante && (
                        <Chip size='small' color='warning' variant='tonal' label='Faltante' />
                      )}
                    </span>
                  }
                />
              </AccordionSummary>
              <AccordionDetails>
                <div className='flex flex-col gap-2'>
                  {s.descripcionMaterial && (
                    <Typography variant='body2'>{s.descripcionMaterial}</Typography>
                  )}
                  {s.tiposMaterial.length > 0 && (
                    <div className='flex flex-wrap gap-1'>
                      {s.tiposMaterial.map(t => (
                        <Chip key={t.id} size='small' variant='tonal' label={t.tipo} />
                      ))}
                    </div>
                  )}
                  {s.incidencias.length > 0 && (
                    <Typography variant='caption' color='text.secondary'>
                      Incidencias: {s.incidencias.map(i => i.tipo).join(', ')}
                    </Typography>
                  )}
                  {(s.evidencias.length > 0 || s.tarimas.length > 0) && (
                    <div className='flex flex-wrap gap-1'>
                      {s.evidencias.map(ev => (
                        <FileLink key={`ev-${ev.id}`} href={ev.archivo} label={ev.tipo || 'Evidencia'} />
                      ))}
                      {s.tarimas.map(tr => (
                        <span key={`tr-${tr.id}`} className='flex'>
                          <FileLink href={tr.tarimaFoto} label='Tarima' />
                          <FileLink href={tr.papeletaFoto} label='Papeleta' />
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </AccordionDetails>
            </Accordion>
          ))}

          {entregados.length > 0 && (
            <div className='mbs-3 flex flex-col gap-1'>
              <Typography variant='caption' color='text.secondary'>
                Ya entregados:
              </Typography>
              {entregados.map(s => (
                <div key={s.id} className='flex items-center gap-2'>
                  <Typography variant='body2' color='text.disabled'>
                    {s.nombreSitio} ({s.idSitio})
                  </Typography>
                  <Chip size='small' variant='tonal' color='success' label={s.folioEntrega ?? 'Entregado'} />
                </div>
              ))}
            </div>
          )}
        </div>

        <Divider />

        {/* --- Datos de la entrega (capturados) --- */}
        <div>
          <Typography variant='subtitle1' className='mbe-3'>
            Datos de la entrega
          </Typography>
          <Grid container spacing={4}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                fullWidth
                size='small'
                type='date'
                label='Fecha'
                slotProps={{ inputLabel: { shrink: true } }}
                value={fecha}
                onChange={e => setFecha(e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                fullWidth
                size='small'
                label='Responsable (opcional)'
                value={nombreResponsable}
                onChange={e => setNombreResponsable(e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                fullWidth
                size='small'
                label='Unidad / Placa'
                value={unidadPlaca}
                onChange={e => setUnidadPlaca(e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                fullWidth
                size='small'
                label='Operador'
                value={nombreOperador}
                onChange={e => setNombreOperador(e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                fullWidth
                size='small'
                type='time'
                label='Hora de llegada'
                slotProps={{ inputLabel: { shrink: true } }}
                value={horaLlegada}
                onChange={e => setHoraLlegada(e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                fullWidth
                size='small'
                type='time'
                label='Inicio de carga'
                slotProps={{ inputLabel: { shrink: true } }}
                value={horaInicioDescarga}
                onChange={e => setHoraInicioDescarga(e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                fullWidth
                size='small'
                type='time'
                label='Hora de salida'
                slotProps={{ inputLabel: { shrink: true } }}
                value={horaSalida}
                onChange={e => setHoraSalida(e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }} className='flex items-center'>
              <FormControlLabel
                control={<Switch checked={confirmado} onChange={e => setConfirmado(e.target.checked)} />}
                label='Confirmado'
              />
            </Grid>
          </Grid>
        </div>

        <Divider />

        {/* --- Documentos --- */}
        <div>
          <Typography variant='subtitle1' className='mbe-2'>
            Documentos
          </Typography>

          {inheritedDocs.length > 0 && (
            <div className='mbe-2'>
              <Typography variant='caption' color='text.secondary'>
                Heredados de la recepción:
              </Typography>
              <div className='flex flex-wrap gap-1'>
                {inheritedDocs.map((d, i) => (
                  <FileLink key={`inh-${i}`} href={d.archivo} label={d.nombre} />
                ))}
              </div>
            </div>
          )}

          {newDocs.length > 0 && (
            <div className='mbe-2 flex flex-col gap-1'>
              {newDocs.map((d, i) => (
                <div key={`new-${i}`} className='flex items-center gap-2'>
                  <FileLink href={d.archivo} label={d.nombre} />
                  <Button size='small' color='error' variant='text' onClick={() => removeNewDoc(i)}>
                    Quitar
                  </Button>
                </div>
              ))}
            </div>
          )}

          <input ref={docInputRef} type='file' accept='.jpg,.jpeg,.png,.pdf' hidden onChange={onDocSelected} />
          <Button
            size='small'
            variant='outlined'
            disabled={uploadingDoc}
            startIcon={<i className='ri-upload-2-line' />}
            onClick={() => docInputRef.current?.click()}
          >
            {uploadingDoc ? 'Subiendo…' : 'Agregar documento'}
          </Button>
        </div>

        {/* --- Acciones --- */}
        <div className='flex justify-end gap-3'>
          <Button
            color='secondary'
            variant='outlined'
            disabled={saving}
            onClick={() => router.push(`/${lang}/warehouses/material-logistics/${encodeURIComponent(folio)}`)}
          >
            Cancelar
          </Button>
          <Button variant='contained' disabled={saving} onClick={submit}>
            {saving ? 'Registrando…' : 'Registrar entrega'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default MaterialLogisticsOut;
