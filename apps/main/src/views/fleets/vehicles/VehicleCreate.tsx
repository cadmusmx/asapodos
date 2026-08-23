'use client';

import { useEffect, useState } from 'react';

import { useParams, useRouter } from 'next/navigation';

import { useForm } from 'react-hook-form';

import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';

import VehicleFormFields from './components/VehicleFormFields';
import { EMPTY_CATALOGS, EMPTY_FORM, toPayload } from './types';
import type { FormCatalogs, VehicleFormValues } from './types';

const VehicleCreate = () => {
  const router = useRouter();
  const { lang } = useParams();

  const [catalogs, setCatalogs] = useState<FormCatalogs>(EMPTY_CATALOGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { control, handleSubmit, setError: setFieldError } = useForm<VehicleFormValues>({ defaultValues: EMPTY_FORM });

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const res = await fetch('/api/fleets/vehicles/form-catalogs');

        if (alive && res.ok) setCatalogs((await res.json()) as FormCatalogs);
      } catch {
        if (alive) setError('No se pudieron cargar los catálogos');
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const onSubmit = async (values: VehicleFormValues) => {
    // La placa es requerida por la API; validamos antes para dar feedback en el campo.
    if (values.placa.trim() === '') {
      setFieldError('placa', { type: 'required', message: 'La placa es requerida' });

      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/fleets/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toPayload(values)),
      });

      const json = (await res.json().catch(() => ({}))) as { id?: number; message?: string };

      if (res.status === 409 || res.status === 400) {
        setError(json.message ?? 'No se pudo crear el vehículo');

        return;
      }

      if (!res.ok || !json.id) throw new Error('No se pudo crear el vehículo');

      // Alta exitosa -> al detalle del nuevo registro (misma pestaña; venimos de una pestaña dedicada).
      router.replace(`/${lang}/fleets/vehicles/${json.id}`);
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
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

  return (
    <Card>
      <CardHeader title='Nuevo vehículo' subheader='Alta en la flotilla del tenant' />
      <CardContent>
        {error && <Alert severity='error' className='mbe-4'>{error}</Alert>}

        <form onSubmit={handleSubmit(onSubmit)}>
          <VehicleFormFields control={control} catalogs={catalogs} disabled={saving} />
          <div className='flex gap-3 justify-end mbs-6'>
            <Button variant='outlined' color='secondary' onClick={() => window.close()} disabled={saving}>
              Cerrar
            </Button>
            <Button type='submit' variant='contained' disabled={saving} startIcon={saving ? <CircularProgress size={16} /> : undefined}>
              Guardar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default VehicleCreate;
