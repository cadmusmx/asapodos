'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import Grid from '@mui/material/Grid2';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';

import { docIconFor } from '../types';
import type { VehicleDocFile, VehicleDocType } from '../types';

interface Props {
  vehicleId: number;
  canUpload: boolean;
  canDelete: boolean;
}

const VehicleDocuments = ({ vehicleId, canUpload, canDelete }: Props) => {
  const [files, setFiles] = useState<VehicleDocFile[]>([]);
  const [types, setTypes] = useState<VehicleDocType[]>([]);
  const [selectedType, setSelectedType] = useState<number | ''>('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/fleets/vehicles/${vehicleId}/documents`);

      if (!res.ok) throw new Error('No se pudieron cargar los documentos');

      const json = (await res.json()) as { files: VehicleDocFile[]; types: VehicleDocType[] };

      setFiles(json.files);
      setTypes(json.types);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [vehicleId]);

  useEffect(() => {
    load();
  }, [load]);

  // UNIQUE por tipo: solo se ofrecen los tipos que aún no tienen documento.
  const usedTypeIds = new Set(files.map(f => f.documentTypeId));
  const availableTypes = types.filter(t => !usedTypeIds.has(t.id));

  const onUpload = async () => {
    const input = fileRef.current;
    const file = input?.files?.[0];

    if (!selectedType) {
      setError('Selecciona un tipo de documento');

      return;
    }

    if (!file) {
      setError('Selecciona un archivo');

      return;
    }

    setUploading(true);
    setError(null);

    try {
      const fd = new FormData();

      fd.append('file', file);
      fd.append('documentTypeId', String(selectedType));

      const res = await fetch(`/api/fleets/vehicles/${vehicleId}/documents`, { method: 'POST', body: fd });
      const json = (await res.json().catch(() => ({}))) as { message?: string };

      if (res.status === 409 || res.status === 400) {
        setError(json.message ?? 'No se pudo subir el documento');

        return;
      }

      if (!res.ok) throw new Error('No se pudo subir el documento');

      setOk('Documento subido');
      setSelectedType('');
      if (input) input.value = '';
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const onDelete = async (fileId: number) => {
    setDeletingId(fileId);
    setError(null);

    try {
      const res = await fetch(`/api/fleets/vehicles/${vehicleId}/documents/${fileId}`, { method: 'DELETE' });

      if (!res.ok) throw new Error('No se pudo eliminar el documento');

      setOk('Documento eliminado');
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Grid container spacing={4}>
      <Grid size={{ xs: 12 }}>
        <Typography variant='subtitle2' color='text.secondary' className='mbe-1'>
          Documentos
        </Typography>
        <Divider />
      </Grid>

      {error && (
        <Grid size={{ xs: 12 }}>
          <Alert severity='error'>{error}</Alert>
        </Grid>
      )}

      {loading ? (
        <Grid size={{ xs: 12 }} className='flex justify-center p-4'>
          <CircularProgress size={24} />
        </Grid>
      ) : (
        <>
          <Grid size={{ xs: 12 }}>
            {files.length === 0 ? (
              <Typography variant='body2' color='text.secondary'>
                Sin documentos cargados.
              </Typography>
            ) : (
              <List dense>
                {files.map(f => (
                  <ListItem
                    key={f.fileId}
                    secondaryAction={
                      canDelete ? (
                        <IconButton
                          edge='end'
                          size='small'
                          color='error'
                          disabled={deletingId === f.fileId}
                          onClick={() => onDelete(f.fileId)}
                        >
                          {deletingId === f.fileId ? <CircularProgress size={16} /> : <i className='ri-delete-bin-line' />}
                        </IconButton>
                      ) : undefined
                    }
                  >
                    <ListItemButton component='a' href={f.url} target='_blank' rel='noopener noreferrer'>
                      <ListItemIcon>
                        <i className={docIconFor(f.url)} />
                      </ListItemIcon>
                      <ListItemText primary={f.documentTypeName ?? 'Documento'} />
                      <i className='ri-external-link-line' />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            )}
          </Grid>

          {canUpload && availableTypes.length > 0 && (
            <>
              <Grid size={{ xs: 12, sm: 5, md: 4 }}>
                <TextField
                  select
                  fullWidth
                  size='small'
                  label='Tipo de documento'
                  value={selectedType}
                  onChange={e => setSelectedType(e.target.value === '' ? '' : Number(e.target.value))}
                >
                  <MenuItem value=''>—</MenuItem>
                  {availableTypes.map(t => (
                    <MenuItem key={t.id} value={t.id}>
                      {t.nombre}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 4, md: 5 }} className='flex items-center'>
                <input ref={fileRef} type='file' accept='.jpg,.jpeg,.png,.pdf' />
              </Grid>
              <Grid size={{ xs: 12, sm: 3, md: 3 }}>
                <Button
                  fullWidth
                  variant='contained'
                  onClick={onUpload}
                  disabled={uploading}
                  startIcon={uploading ? <CircularProgress size={16} /> : <i className='ri-upload-2-line' />}
                >
                  Subir
                </Button>
              </Grid>
            </>
          )}

          {canUpload && availableTypes.length === 0 && files.length > 0 && (
            <Grid size={{ xs: 12 }}>
              <Typography variant='caption' color='text.secondary'>
                Todos los tipos de documento ya están cargados.
              </Typography>
            </Grid>
          )}
        </>
      )}

      <Snackbar
        open={!!ok}
        autoHideDuration={3000}
        onClose={() => setOk(null)}
        message={ok ?? ''}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      />
    </Grid>
  );
};

export default VehicleDocuments;
