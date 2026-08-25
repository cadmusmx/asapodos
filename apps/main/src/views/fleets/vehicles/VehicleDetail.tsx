'use client';

import { useCallback, useEffect, useState } from 'react';

import { useForm } from 'react-hook-form';

import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid2';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import CircularProgress from '@mui/material/CircularProgress';

import VehicleFormFields from './components/VehicleFormFields';
import VehicleDocuments from './components/VehicleDocuments';
import { EMPTY_CATALOGS, EMPTY_FORM, toFormValues, toPayload } from './types';
import type { FormCatalogs, VehicleDetailData, VehicleFormValues } from './types';

const VigenciaChip = ({ value }: { value: 'VIGENTE' | 'VENCIDA' | null }) => {
  if (value === null) return <>—</>;

  return <Chip size='small' variant='tonal' color={value === 'VENCIDA' ? 'error' : 'success'} label={value === 'VENCIDA' ? 'Vencida' : 'Vigente'} />;
};

const VerificacionChip = ({ dias }: { dias: number | null }) => {
  if (dias === null) return <>—</>;
  if (dias === 0) return <Chip size='small' variant='tonal' color='error' label='Vencida' />;
  if (dias <= 30) return <Chip size='small' variant='tonal' color='warning' label={`${dias} días`} />;

  return <Chip size='small' variant='tonal' color='success' label={`${dias} días`} />;
};

const ReadField = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
    <Typography variant='caption' color='text.secondary'>{label}</Typography>
    <Typography variant='body2'>{value ?? '—'}</Typography>
  </Grid>
);

const VehicleDetail = ({
  vehicleId,
  canEdit,
  canUpload,
  canDelete,
}: {
  vehicleId: number;
  canEdit: boolean;
  canUpload: boolean;
  canDelete: boolean;
}) => {
  const [detail, setDetail] = useState<VehicleDetailData | null>(null);
  const [catalogs, setCatalogs] = useState<FormCatalogs>(EMPTY_CATALOGS);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const { control, handleSubmit, reset } = useForm<VehicleFormValues>({ defaultValues: EMPTY_FORM });

  const loadDetail = useCallback(async () => {
    const res = await fetch(`/api/fleets/vehicles/${vehicleId}`);

    if (res.status === 404) throw new Error('Vehículo no encontrado');
    if (res.status === 403) throw new Error('No tienes permiso para ver este vehículo');
    if (!res.ok) throw new Error('No se pudo cargar el vehículo');

    const data = (await res.json()) as VehicleDetailData;

    setDetail(data);
    reset(toFormValues(data));
  }, [vehicleId, reset]);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setError(null);

      try {
        const catRes = await fetch('/api/fleets/vehicles/form-catalogs');

        if (alive && catRes.ok) setCatalogs((await catRes.json()) as FormCatalogs);
        await loadDetail();
      } catch (e) {
        if (alive) setError((e as Error).message);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [loadDetail]);

  const onSubmit = async (values: VehicleFormValues) => {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/fleets/vehicles/${vehicleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toPayload(values)),
      });

      if (res.status === 409) {
        setError(((await res.json()) as { message: string }).message);

        return;
      }

      if (!res.ok) throw new Error('No se pudieron guardar los cambios');

      await loadDetail();
      setEditing(false);
      setOk('Cambios guardados');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    if (detail) reset(toFormValues(detail));
    setError(null);
    setEditing(false);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className='flex justify-center p-10'>
          <CircularProgress />
        </CardContent>
      </Card>
    );
  }

  if (!detail) {
    return <Alert severity='error'>{error ?? 'No se pudo cargar el vehículo'}</Alert>;
  }

  const d = detail;
  const title = `${d.Placa ?? 'Sin placa'}${d.NoEconomico ? ` · No. Eco. ${d.NoEconomico}` : ''}`;

  return (
    <>
      <Card>
        <CardHeader
          title={title}
          subheader={[d.MarcaNombre, d.Modelo, d.TipoVehiculoNombre].filter(Boolean).join(' · ') || undefined}
          action={
            !editing && canEdit ? (
              <Button variant='contained' startIcon={<i className='ri-edit-line' />} onClick={() => setEditing(true)}>
                Editar
              </Button>
            ) : null
          }
        />
        <CardContent>
          {error && <Alert severity='error' className='mbe-4'>{error}</Alert>}

          {editing ? (
            <form onSubmit={handleSubmit(onSubmit)}>
              <VehicleFormFields control={control} catalogs={catalogs} disabled={saving} />
              <div className='flex gap-3 justify-end mbs-6'>
                <Button variant='outlined' color='secondary' onClick={cancel} disabled={saving}>
                  Cancelar
                </Button>
                <Button type='submit' variant='contained' disabled={saving} startIcon={saving ? <CircularProgress size={16} /> : undefined}>
                  Guardar
                </Button>
              </div>
            </form>
          ) : (
            <Grid container spacing={4}>
              <Grid size={{ xs: 12 }}>
                <Typography variant='subtitle2' color='text.secondary' className='mbe-1'>Vigencias</Typography>
                <Divider />
              </Grid>
              <ReadField label='Póliza' value={<VigenciaChip value={d.VigenciaPoliza} />} />
              <ReadField label='Tarjeta' value={<VigenciaChip value={d.VigenciaTarjeta} />} />
              <ReadField label='Verificación' value={<VerificacionChip dias={d.VerificacionDiasRestantes} />} />
              <ReadField label='Estatus' value={d.EstatusNombre} />

              <Grid size={{ xs: 12 }}>
                <Typography variant='subtitle2' color='text.secondary' className='mbe-1'>Identificación</Typography>
                <Divider />
              </Grid>
              <ReadField label='VIN / Serie' value={d.SerialVehiculo} />
              <ReadField label='No. Motor' value={d.SerialMotor} />
              <ReadField label='Marca' value={d.MarcaNombre} />
              <ReadField label='Línea' value={d.Linea} />
              <ReadField label='Color' value={d.ColorNombre} />
              <ReadField label='Combustible' value={d.CombustibleNombre} />
              <ReadField label='Puertas' value={d.Puertas} />
              <ReadField label='Tracción' value={d.Traccion} />

              <Grid size={{ xs: 12 }}>
                <Typography variant='subtitle2' color='text.secondary' className='mbe-1'>Documentación</Typography>
                <Divider />
              </Grid>
              <ReadField label='Póliza' value={d.Poliza} />
              <ReadField label='Aseguradora' value={d.AseguradoraNombre} />
              <ReadField label='Vence póliza' value={d.FechaVencimientoPoliza?.slice(0, 10)} />
              <ReadField label='Estado (placa)' value={d.EstadoPlacaNombre} />
              <ReadField label='Vence tarjeta' value={d.FechaVencimientoTarjeta?.slice(0, 10)} />

              <Grid size={{ xs: 12 }}>
                <Typography variant='subtitle2' color='text.secondary' className='mbe-1'>Asignación</Typography>
                <Divider />
              </Grid>
              <ReadField label='Departamento' value={d.DepartamentoNombre} />
              <ReadField label='Conductor' value={d.ConductorNombre ?? 'Sin asignar'} />
              <ReadField label='Propietario' value={d.PropietarioNombre} />
              <ReadField label='Ubicación' value={d.Ubicacion} />
              <ReadField label='Región' value={d.Region} />
              <ReadField label='Kilometraje' value={d.Kilometraje} />

              {d.Notas && (
                <>
                  <Grid size={{ xs: 12 }}>
                    <Typography variant='subtitle2' color='text.secondary' className='mbe-1'>Notas</Typography>
                    <Divider />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Typography variant='body2'>{d.Notas}</Typography>
                  </Grid>
                </>
              )}
            </Grid>
          )}
        </CardContent>
      </Card>

      <Card className='mbs-6'>
        <CardContent>
          <VehicleDocuments vehicleId={vehicleId} canUpload={canUpload} canDelete={canDelete} />
        </CardContent>
      </Card>

      <Snackbar
        open={!!ok}
        autoHideDuration={3000}
        onClose={() => setOk(null)}
        message={ok ?? ''}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      />
    </>
  );
};

export default VehicleDetail;
