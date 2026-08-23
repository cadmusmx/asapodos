'use client';

import { Controller } from 'react-hook-form';
import type { Control } from 'react-hook-form';

import Grid from '@mui/material/Grid2';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';

import ConductorAutocomplete from './ConductorAutocomplete';
import type { CatOption, FormCatalogs, VehicleFormValues } from '../types';

type Cfg =
  | { kind: 'text' | 'date' | 'number'; name: keyof VehicleFormValues; label: string; size?: number }
  | { kind: 'select'; name: keyof VehicleFormValues; label: string; options: CatOption[]; size?: number };

interface Props {
  control: Control<VehicleFormValues>;
  catalogs: FormCatalogs;
  disabled?: boolean;
}

const VehicleFormFields = ({ control, catalogs, disabled }: Props) => {
  const renderField = (cfg: Cfg) => (
    <Grid key={cfg.name} size={{ xs: 12, sm: 6, md: cfg.size ?? 3 }}>
      <Controller
        name={cfg.name}
        control={control}
        render={({ field }) => {
          if (cfg.kind === 'select') {
            return (
              <TextField
                select fullWidth size='small' label={cfg.label} disabled={disabled}
                value={field.value ?? ''} onChange={field.onChange} onBlur={field.onBlur} inputRef={field.ref}
              >
                <MenuItem value=''>—</MenuItem>
                {cfg.options.map(o => (
                  <MenuItem key={o.Id} value={o.Id}>{o.Nombre}</MenuItem>
                ))}
              </TextField>
            );
          }

          if (cfg.kind === 'number') {
            return (
              <TextField
                type='number' fullWidth size='small' label={cfg.label} disabled={disabled}
                value={field.value ?? ''} onBlur={field.onBlur} inputRef={field.ref}
                onChange={e => field.onChange(e.target.value === '' ? '' : Number(e.target.value))}
              />
            );
          }

          if (cfg.kind === 'date') {
            return (
              <TextField
                type='date' fullWidth size='small' label={cfg.label} disabled={disabled}
                slotProps={{ inputLabel: { shrink: true } }} {...field}
              />
            );
          }

          return <TextField fullWidth size='small' label={cfg.label} disabled={disabled} {...field} />;
        }}
      />
    </Grid>
  );

  const identificacion: Cfg[] = [
    { kind: 'text', name: 'placa', label: 'Placa' },
    { kind: 'text', name: 'noEconomico', label: 'No. Económico' },
    { kind: 'text', name: 'serialVehiculo', label: 'VIN / Serie' },
    { kind: 'text', name: 'serialMotor', label: 'No. Motor' },
    { kind: 'select', name: 'marca', label: 'Marca', options: catalogs.marcas },
    { kind: 'text', name: 'linea', label: 'Línea' },
    { kind: 'text', name: 'modelo', label: 'Modelo (año)' },
    { kind: 'select', name: 'color', label: 'Color', options: catalogs.colores },
    { kind: 'select', name: 'tipoVehiculo', label: 'Tipo', options: catalogs.tiposVehiculo },
    { kind: 'select', name: 'combustible', label: 'Combustible', options: catalogs.combustibles },
    { kind: 'number', name: 'puertas', label: 'Puertas' },
    { kind: 'text', name: 'traccion', label: 'Tracción' },
  ];

  const documentacion: Cfg[] = [
    { kind: 'text', name: 'poliza', label: 'Póliza' },
    { kind: 'select', name: 'empresa', label: 'Aseguradora', options: catalogs.aseguradoras },
    { kind: 'date', name: 'fechaVencimientoPoliza', label: 'Vence póliza' },
    { kind: 'select', name: 'idEstadoPlaca', label: 'Estado (placa)', options: catalogs.estadosPlaca },
    { kind: 'date', name: 'fechaVencimientoTarjeta', label: 'Vence tarjeta' },
  ];

  const verificacion: Cfg[] = [
    { kind: 'date', name: 'fechaVerificacion', label: 'Última verificación' },
    { kind: 'date', name: 'fechaProximaVerificacion', label: 'Próxima verificación' },
  ];

  const asignacion: Cfg[] = [
    { kind: 'select', name: 'estatus', label: 'Estatus', options: catalogs.estatuses },
    { kind: 'select', name: 'departamento', label: 'Departamento', options: catalogs.departamentos },
    { kind: 'select', name: 'propietario', label: 'Propietario', options: catalogs.propietarios },
    { kind: 'text', name: 'ubicacion', label: 'Ubicación' },
    { kind: 'number', name: 'region', label: 'Región' },
    { kind: 'number', name: 'kilometraje', label: 'Kilometraje' },
  ];

  const Section = ({ title, fields }: { title: string; fields: Cfg[] }) => (
    <>
      <Grid size={{ xs: 12 }}>
        <Typography variant='subtitle2' color='text.secondary' className='mbe-1'>{title}</Typography>
        <Divider />
      </Grid>
      {fields.map(renderField)}
    </>
  );

  return (
    <Grid container spacing={4}>
      <Section title='Identificación' fields={identificacion} />
      <Section title='Documentación' fields={documentacion} />
      <Section title='Verificación' fields={verificacion} />
      <Section title='Asignación' fields={asignacion} />

      {/* Conductor: Autocomplete contra empleados */}
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Controller
          name='conductor'
          control={control}
          render={({ field }) => (
            <ConductorAutocomplete value={field.value} onChange={field.onChange} disabled={disabled} />
          )}
        />
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Controller
          name='notas'
          control={control}
          render={({ field }) => (
            <TextField fullWidth multiline minRows={2} size='small' label='Notas' disabled={disabled} {...field} />
          )}
        />
      </Grid>
    </Grid>
  );
};

export default VehicleFormFields;
