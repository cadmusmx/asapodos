'use client';

import { useEffect, useState } from 'react';

import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';

import type { ConductorOption } from '../types';

interface Props {
  value: ConductorOption | null;
  onChange: (value: ConductorOption | null) => void;
  disabled?: boolean;
}

// Reutiliza el endpoint de empleados (protegido por 'employees'). Sin ese permiso
// el fetch da 403 -> deshabilita el campo con aviso (no rompe el resto del form).
const ConductorAutocomplete = ({ value, onChange, disabled }: Props) => {
  const [input, setInput] = useState('');
  const [options, setOptions] = useState<ConductorOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    if (forbidden) return;

    const q = input.trim();

    if (q.length < 2) {
      setOptions([]);

      return;
    }

    const controller = new AbortController();

    const timer = setTimeout(async () => {
      setLoading(true);

      try {
        const params = new URLSearchParams({ search: q, active: 'true', pageSize: '20' });
        const res = await fetch(`/api/human-capital/employees?${params.toString()}`, { signal: controller.signal });

        if (res.status === 403) {
          setForbidden(true);
          setOptions([]);

          return;
        }

        if (!res.ok) throw new Error('employees');

        const json = (await res.json()) as { data: Array<Record<string, unknown>> };

        setOptions(
          json.data.map(e => {
            const id = Number(e.id);
            const fullName = (e.fullName as string | undefined) ?? '';
            const num = (e.employeeNumber as string | undefined) ?? null;

            return { id, label: num ? `${fullName} (${num})` : fullName };
          }),
        );
      } catch (e) {
        if ((e as Error).name !== 'AbortError') setOptions([]);
      } finally {
        setLoading(false);
      }
    }, 1000);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [input, forbidden]);

  // El value precargado puede no estar en options: lo inyectamos para evitar el warning de MUI.
  const merged = value && !options.some(o => o.id === value.id) ? [value, ...options] : options;

  return (
    <Autocomplete
      value={value}
      onChange={(_, v) => onChange(v)}
      onInputChange={(_, v) => setInput(v)}
      options={merged}
      loading={loading}
      disabled={disabled || forbidden}
      filterOptions={x => x}
      isOptionEqualToValue={(o, v) => o.id === v.id}
      getOptionLabel={o => o.label}
      noOptionsText={input.trim().length < 2 ? 'Escribe para buscar…' : 'Sin resultados'}
      renderInput={params => (
        <TextField
          {...params}
          size='small'
          label='Conductor'
          helperText={forbidden ? 'Requiere permiso de empleados para asignar conductor' : undefined}
          slotProps={{
            input: {
              ...params.InputProps,
              endAdornment: (
                <>
                  {loading ? <CircularProgress color='inherit' size={18} /> : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            },
          }}
        />
      )}
    />
  );
};

export default ConductorAutocomplete;
