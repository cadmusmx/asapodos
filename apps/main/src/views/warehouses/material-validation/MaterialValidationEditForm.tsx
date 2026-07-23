'use client';

// React Imports
import { useEffect, useMemo, useRef, useState } from 'react';

// Next Imports
import { useParams, useRouter } from 'next/navigation';

// MUI Imports
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid2';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';

// Third-party Imports
import { toast } from 'react-toastify';
import { Controller, useForm } from 'react-hook-form';

import type { AlmacenRow, CarrierRow, EstadoFisicoRow, MotivoRow, ProyectoRow, TipoMaterialRow } from '@/app/api/warehouses/material-validation/catalogs/route';

// Base pública S3 (misma que el detalle) para enlazar documentos existentes.
const S3_BASE = process.env.NEXT_PUBLIC_S3_PUBLIC_BASE_URL ?? '';

const fileUrl = (key?: string | null): string => {
  if (!key) return '';
  if (!S3_BASE) return key;

  return `${S3_BASE.replace(/\/+$/, '')}/${String(key).replace(/^\/+/, '')}`;
};

interface Catalogs {
  almacenes: Array<AlmacenRow>;
  proyectos: Array<ProyectoRow>;
  tiposMaterial: Array<TipoMaterialRow>;
  carriers: Array<CarrierRow>;
  motivos: Array<MotivoRow>;
  estadosFisicos: Array<EstadoFisicoRow>;
}

interface Documento { name: string; file: string }

interface FormValues {
  idProyecto: number | '';
  idTipoMaterial: number | '';
  fecha: string;
  nombreSitio: string;
  idSitio: string;
  cuentaCliente: string;
  nombreContacto: string;
  idCarrier: number | '';
  carrier: string;
  idAlmacenDestino: number | '';
  notas: string;
}

const EMPTY_CATALOGS: Catalogs = {
  almacenes: [], proyectos: [], tiposMaterial: [], carriers: [], motivos: [], estadosFisicos: [],
};

const toDateInput = (iso?: string): string => {
  if (!iso) return '';
  const d = new Date(iso);

  if (isNaN(d.getTime())) return '';

  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const parseDocs = (json: unknown): Documento[] => {
  if (typeof json !== 'string' || !json) return [];

  try {
    const arr = JSON.parse(json);

    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
};

/** Conserva el id solo si sigue vigente (activo) en el catálogo; si no, '' para forzar reselección. */
const idSiVigente = (list: Array<{ Id: number }>, id: unknown): number | '' =>
  list.some(x => x.Id === Number(id)) ? Number(id) : '';

const MaterialValidationEditForm = ({ folio }: { folio: string }) => {
  const router = useRouter();
  const { lang } = useParams();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [catalogs, setCatalogs] = useState<Catalogs>(EMPTY_CATALOGS);
  const [docs, setDocs] = useState<Documento[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const { control, handleSubmit, reset, watch } = useForm<FormValues>({
    defaultValues: {
      idProyecto: '', idTipoMaterial: '', fecha: '', nombreSitio: '', idSitio: '',
      cuentaCliente: '', nombreContacto: '', idCarrier: '', carrier: '', idAlmacenDestino: '', notas: '',
    },
  });

  const idCarrier = watch('idCarrier');
  const carrierEsOtro = catalogs.carriers.find(c => c.Id === Number(idCarrier))?.EsOtro ?? false;

  const backToDetail = () => router.push(`/${lang}/warehouses/material-validation/${encodeURIComponent(folio)}`);

  // Carga catálogos + registro y prellena el form.
  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      setLoadError(null);

      try {
        const [catRes, recRes] = await Promise.all([
          fetch('/api/warehouses/material-validation/catalogs', { signal: controller.signal }),
          fetch(`/api/warehouses/material-validation/${encodeURIComponent(folio)}`, { signal: controller.signal }),
        ]);

        if (!catRes.ok) throw new Error('No se pudieron cargar los catálogos.');
        if (recRes.status === 403) throw new Error('No tienes permiso para editar este registro.');
        if (recRes.status === 404) throw new Error('Registro no encontrado.');
        if (!recRes.ok) throw new Error('No se pudo cargar el registro.');

        const cat: Catalogs = await catRes.json();
        const rec = await recRes.json();

        if (rec.Status !== 0) throw new Error('El registro ya no es editable.');

        setCatalogs(cat);
        setDocs(parseDocs(rec.MaterialDocumentos));
        reset({
          idProyecto: idSiVigente(cat.proyectos, rec.IdProyecto),
          idTipoMaterial: idSiVigente(cat.tiposMaterial, rec.IdTipoMaterial),
          idAlmacenDestino: idSiVigente(cat.almacenes, rec.IdAlmacenDestino),
          fecha: toDateInput(rec.Fecha),
          nombreSitio: rec.NombreSitio ?? '',
          idSitio: rec.IdSitio ?? '',
          cuentaCliente: rec.CuentaCliente ?? '',
          nombreContacto: rec.NombreContacto ?? '',
          idCarrier: rec.IdCarrier ?? '',
          carrier: rec.OtroCarrier ?? '',
          notas: rec.Notas ?? '',
        });
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
        setLoadError((e as Error).message);
      } finally {
        setLoading(false);
      }
    };

    load();

    return () => controller.abort();
  }, [folio, reset]);

  const onPickFile = () => fileInputRef.current?.click();

  const onFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    e.target.value = ''; // permite re-seleccionar el mismo archivo
    if (!file) return;

    setUploading(true);

    try {
      const fd = new FormData();

      fd.append('file', file);

      const res = await fetch('/api/warehouses/material-validation/documents', { method: 'POST', body: fd });

      if (!res.ok) {
        const { message } = await res.json().catch(() => ({ message: 'Error al subir el documento' }));

        throw new Error(message);
      }

      const { key } = await res.json();

      setDocs(prev => [...prev, { name: file.name, file: key }]);
      toast.success('Documento subido');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const removeDoc = (index: number) => setDocs(prev => prev.filter((_, i) => i !== index));

  const onSubmit = async (values: FormValues) => {
    setSaving(true);

    try {
      const body: Record<string, unknown> = {
        idProyecto: values.idProyecto === '' ? undefined : Number(values.idProyecto),
        idTipoMaterial: values.idTipoMaterial === '' ? undefined : Number(values.idTipoMaterial),
        fecha: values.fecha || undefined,
        nombreSitio: values.nombreSitio,
        idSitio: values.idSitio,
        cuentaCliente: values.cuentaCliente,
        nombreContacto: values.nombreContacto,
        idCarrier: values.idCarrier === '' ? undefined : Number(values.idCarrier),
        carrier: carrierEsOtro ? values.carrier : null,
        idAlmacenDestino: values.idAlmacenDestino === '' ? undefined : Number(values.idAlmacenDestino),
        notas: values.notas,
        materialDocumentos: JSON.stringify(docs),
      };

      const res = await fetch(`/api/warehouses/material-validation/${encodeURIComponent(folio)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.status === 403) throw new Error('No tienes permiso para editar este registro.');
      if (res.status === 404) throw new Error('Registro no encontrado.');
      if (res.status === 409) throw new Error('El registro ya no es editable.');

      if (!res.ok) {
        const { message } = await res.json().catch(() => ({ message: 'No se pudo guardar' }));

        throw new Error(message);
      }

      toast.success('Cambios guardados');
      backToDetail();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const documentos = useMemo(() => docs, [docs]);

  if (loading) {
    return (
      <Card><CardContent>
        <div className='flex items-center justify-center min-bs-[240px]'><CircularProgress /></div>
      </CardContent></Card>
    );
  }

  if (loadError) {
    return (
      <Card><CardContent>
        <Alert severity='error' className='mbe-4'>{loadError}</Alert>
        <Button variant='outlined' onClick={backToDetail}>Volver</Button>
      </CardContent></Card>
    );
  }

  return (
    <Card>
      <CardHeader title={`Editar folio ${folio}`} />
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Grid container spacing={5}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Controller
                name='idProyecto' control={control} rules={{ required: true }}
                render={({ field, fieldState }) => (
                  <TextField {...field} select fullWidth label='Proyecto' error={!!fieldState.error}>
                    {catalogs.proyectos.map(p => <MenuItem key={p.Id} value={p.Id}>{p.Proyecto}</MenuItem>)}
                  </TextField>
                )}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Controller
                name='idTipoMaterial' control={control} rules={{ required: true }}
                render={({ field, fieldState }) => (
                  <TextField {...field} select fullWidth label='Tipo de material' error={!!fieldState.error}>
                    {catalogs.tiposMaterial.map(t => <MenuItem key={t.Id} value={t.Id}>{t.Tipo}</MenuItem>)}
                  </TextField>
                )}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Controller
                name='fecha' control={control}
                render={({ field }) => (
                  <TextField {...field} type='date' fullWidth label='Fecha' InputLabelProps={{ shrink: true }} />
                )}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Controller name='nombreSitio' control={control} rules={{ required: true }}
                render={({ field, fieldState }) => <TextField {...field} fullWidth label='Nombre del sitio' error={!!fieldState.error} />} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Controller name='idSitio' control={control} rules={{ required: true }}
                render={({ field, fieldState }) => <TextField {...field} fullWidth label='ID del sitio' error={!!fieldState.error} />} />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Controller name='cuentaCliente' control={control} rules={{ required: true }}
                render={({ field, fieldState }) => <TextField {...field} fullWidth label='Cuenta cliente' error={!!fieldState.error} />} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Controller name='nombreContacto' control={control} rules={{ required: true }}
                render={({ field, fieldState }) => <TextField {...field} fullWidth label='Contacto' error={!!fieldState.error} />} />
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <Controller
                name='idCarrier' control={control} rules={{ required: true }}
                render={({ field, fieldState }) => (
                  <TextField {...field} select fullWidth label='Carrier' error={!!fieldState.error}>
                    {catalogs.carriers.map(c => <MenuItem key={c.Id} value={c.Id}>{c.Carrier}</MenuItem>)}
                  </TextField>
                )}
              />
            </Grid>
            {carrierEsOtro && (
              <Grid size={{ xs: 12, md: 4 }}>
                <Controller name='carrier' control={control} rules={{ required: carrierEsOtro }}
                  render={({ field, fieldState }) => <TextField {...field} fullWidth label='Otro carrier' error={!!fieldState.error} />} />
              </Grid>
            )}
            <Grid size={{ xs: 12, md: 4 }}>
              <Controller
                name='idAlmacenDestino' control={control} rules={{ required: true }}
                render={({ field, fieldState }) => (
                  <TextField {...field} select fullWidth label='Almacén destino' error={!!fieldState.error}>
                    {catalogs.almacenes.map(a => <MenuItem key={a.Id} value={a.Id}>{a.Nombre}</MenuItem>)}
                  </TextField>
                )}
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Controller name='notas' control={control}
                render={({ field }) => <TextField {...field} fullWidth multiline minRows={2} label='Notas' />} />
            </Grid>
          </Grid>

          <Divider className='mlb-6' />

          {/* Documentos */}
          <div className='flex items-center justify-between mbe-4'>
            <Typography variant='h6'>Documentos</Typography>
            <Button
              variant='outlined' color='secondary' size='small' onClick={onPickFile} disabled={uploading}
              startIcon={uploading ? <CircularProgress size={16} /> : <i className='ri-upload-2-line' />}
            >
              Subir documento
            </Button>
            <input
              ref={fileInputRef} type='file' hidden accept='.jpg,.jpeg,.png,.pdf' onChange={onFileSelected}
            />
          </div>
          {documentos.length === 0 ? (
            <Typography variant='body2' color='text.secondary'>Sin documentos</Typography>
          ) : (
            <div className='flex flex-col gap-2'>
              {documentos.map((d, i) => (
                <div key={i} className='flex items-center justify-between'>
                  <a href={fileUrl(d.file)} target='_blank' rel='noreferrer'>{d.name || `Documento ${i + 1}`}</a>
                  <IconButton size='small' color='error' onClick={() => removeDoc(i)}>
                    <i className='ri-delete-bin-7-line' />
                  </IconButton>
                </div>
              ))}
            </div>
          )}

          <Divider className='mlb-6' />

          <div className='flex gap-3 justify-end'>
            <Button variant='contained' color='inherit' onClick={backToDetail} disabled={saving}>Cancelar</Button>
            <Button
              type='submit' variant='contained' disabled={saving}
              startIcon={saving ? <CircularProgress size={16} /> : undefined}
            >
              Guardar cambios
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default MaterialValidationEditForm;
