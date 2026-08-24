'use client';

import { useEffect, useState } from 'react';

import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';

import type { VehicleDocFile } from '../types';
import { docIconFor } from '../types';

interface Props {
  vehicleId: number | null;
  title?: string;
  open: boolean;
  onClose: () => void;
}

const VehicleDocumentsModal = ({ vehicleId, title, open, onClose }: Props) => {
  const [files, setFiles] = useState<VehicleDocFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !vehicleId) return;

    const controller = new AbortController();

    (async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/fleets/vehicles/${vehicleId}/documents`, { signal: controller.signal });

        if (!res.ok) throw new Error('No se pudieron cargar los documentos');

        const json = (await res.json()) as { files: VehicleDocFile[] };

        setFiles(json.files);
      } catch (e) {
        if ((e as Error).name !== 'AbortError') setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [open, vehicleId]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth='xs' fullWidth>
      <DialogTitle className='flex items-center justify-between gap-4'>
        <span>Documentos{title ? ` · ${title}` : ''}</span>
        <IconButton size='small' onClick={onClose}>
          <i className='ri-close-line' />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        {loading && (
          <div className='flex justify-center p-4'>
            <CircularProgress size={24} />
          </div>
        )}
        {error && <Alert severity='error'>{error}</Alert>}
        {!loading && !error && files.length === 0 && (
          <Typography variant='body2' color='text.secondary'>
            Sin documentos cargados.
          </Typography>
        )}
        {!loading && files.length > 0 && (
          <List dense>
            {files.map(f => (
              <ListItem key={f.fileId} disablePadding>
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
      </DialogContent>
    </Dialog>
  );
};

export default VehicleDocumentsModal;
