'use client';

// React Imports
import { useCallback, useEffect, useRef, useState } from 'react';

// MUI Imports
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import Grid from '@mui/material/Grid2';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';

export interface ExportDialogProps {
  open: boolean;
  onClose: () => void;

  /** Ruta del export del módulo, p. ej. /api/warehouses/material-validation/export/xlsx */
  exportBaseUrl: string;

  /**
   * Filtros NO-fecha ya resueltos a query params (es/re, proyecto, almacén, etc.).
   * El modal les añade fechaInicio/fechaFin y countOnly.
   */
  baseParams: Record<string, string>;

  /** Chips de solo lectura con los filtros aplicados ("Tipo: Scrap", "Carrier: Telcel"). */
  filterChips?: string[];

  /** Precarga desde el rango del listado, si lo tiene. */
  initialFechaInicio?: string;
  initialFechaFin?: string;
}

const buildUrl = (base: string, params: Record<string, string>): string => {
  const sp = new URLSearchParams(params);

  return `${base}?${sp.toString()}`;
};

const ExportDialog = ({
  open, onClose, exportBaseUrl, baseParams, filterChips = [], initialFechaInicio = '', initialFechaFin = '',
}: ExportDialogProps) => {
  const [fechaInicio, setFechaInicio] = useState(initialFechaInicio);
  const [fechaFin, setFechaFin] = useState(initialFechaFin);
  const [count, setCount] = useState<number | null>(null);
  const [max, setMax] = useState<number | null>(null);
  const [counting, setCounting] = useState(false);
  const [countError, setCountError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Al abrir, resincroniza con el rango del listado.
  useEffect(() => {
    if (open) {
      setFechaInicio(initialFechaInicio);
      setFechaFin(initialFechaFin);
    }
  }, [open, initialFechaInicio, initialFechaFin]);

  const rangoCompleto = !!fechaInicio && !!fechaFin;
  const rangoValido = rangoCompleto && fechaInicio <= fechaFin;

  const dateParams = useCallback(
    (extra: Record<string, string> = {}) => ({
      ...baseParams,
      ...(fechaInicio ? { fechaInicio } : {}),
      ...(fechaFin ? { fechaFin } : {}),
      ...extra,
    }),
    [baseParams, fechaInicio, fechaFin],
  );

  // Conteo autoritativo (server) con debounce cada vez que cambia el rango.
  useEffect(() => {
    if (!open) return;

    if (!rangoValido) {
      setCount(null);
      setCountError(null);

      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    const controller = new AbortController();

    debounceRef.current = setTimeout(async () => {
      setCounting(true);
      setCountError(null);

      try {
        const res = await fetch(buildUrl(exportBaseUrl, dateParams({ countOnly: '1' })), { signal: controller.signal });

        if (!res.ok) throw new Error('No se pudo calcular la cantidad de registros.');

        const json: { count: number; max: number } = await res.json();

        setCount(json.count);
        setMax(json.max);
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
        setCountError((e as Error).message);
        setCount(null);
      } finally {
        setCounting(false);
      }
    }, 400);

    return () => {
      controller.abort();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [open, rangoValido, exportBaseUrl, dateParams]);

  const excede = count != null && max != null && count > max;
  const vacio = count === 0;
  const puedeExportar = rangoValido && count != null && !excede && !vacio && !counting && !downloading;

  const onExport = async () => {
    if (!puedeExportar) return;

    setDownloading(true);

    try {
      const res = await fetch(buildUrl(exportBaseUrl, dateParams()));

      if (!res.ok) {
        const { message } = await res.json().catch(() => ({ message: 'No se pudo exportar' }));

        throw new Error(message);
      }

      // Descarga del blob (el server manda Content-Disposition).
      const blob = await res.blob();
      const disposition = res.headers.get('Content-Disposition') ?? '';
      const match = disposition.match(/filename="?([^"]+)"?/);
      const filename = match?.[1] ?? 'export.xlsx';

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');

      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      onClose();
    } catch (e) {
      setCountError((e as Error).message);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth='sm'>
      <DialogTitle>Exportar a Excel</DialogTitle>
      <DialogContent>
        {filterChips.length > 0 && (
          <Box className='mbe-4 flex flex-wrap gap-2'>
            {filterChips.map((c, i) => <Chip key={i} size='small' variant='tonal' label={c} />)}
          </Box>
        )}

        <DialogContentText className='mbe-4'>
          Elige el rango de fechas a exportar. La cantidad de registros debe ser
          {max != null ? ` menor o igual a ${max}` : ' menor o igual al límite'}.
        </DialogContentText>

        <Grid container spacing={4}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth type='date' label='Desde' slotProps={{ inputLabel: { shrink: true } }}
              value={fechaInicio} onChange={e => setFechaInicio(e.target.value)}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth type='date' label='Hasta' slotProps={{ inputLabel: { shrink: true } }}
              value={fechaFin} onChange={e => setFechaFin(e.target.value)}
            />
          </Grid>
        </Grid>

        <Box className='mbs-4'>
          {!rangoCompleto && (
            <Typography variant='body2' color='text.secondary'>Elige un rango de fechas para continuar.</Typography>
          )}
          {rangoCompleto && !rangoValido && (
            <Alert severity='warning'>La fecha inicial no puede ser mayor que la final.</Alert>
          )}
          {rangoValido && counting && (
            <Box className='flex items-center gap-2'>
              <CircularProgress size={16} /><Typography variant='body2'>Calculando…</Typography>
            </Box>
          )}
          {rangoValido && !counting && countError && <Alert severity='error'>{countError}</Alert>}
          {rangoValido && !counting && !countError && count != null && (
            excede ? (
              <Alert severity='warning'>
                {count} registros. Ajuste el rango de fechas para reducir la cantidad de registros a exportar,
                debe ser menor o igual a {max}.
              </Alert>
            ) : vacio ? (
              <Alert severity='info'>No hay registros en ese rango.</Alert>
            ) : (
              <Typography variant='body2' color='success.main'>{count} registros a exportar.</Typography>
            )
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button color='secondary' onClick={onClose} disabled={downloading}>Cancelar</Button>
        <Button
          variant='contained' onClick={onExport} disabled={!puedeExportar}
          startIcon={downloading ? <CircularProgress size={16} /> : <i className='ri-file-excel-2-line' />}
        >
          Exportar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ExportDialog;
