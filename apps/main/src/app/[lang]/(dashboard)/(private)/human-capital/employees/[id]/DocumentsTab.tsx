'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

type EmployeeFile = {
  fileId: number;
  documentTypeId: number | null;
  documentTypeName: string | null;
  url: string;
  isUrl: boolean;
};

type DocumentType = { id: number; name: string };

type FeedbackState = { type: 'success' | 'error'; message: string } | null;

type DocumentsTabProps = {
  employeeId: number;
  canCreate?: boolean;
  canDelete?: boolean;
};

const DocumentsTab = ({ employeeId, canCreate = false, canDelete = false }: DocumentsTabProps) => {
  const [files, setFiles] = useState<EmployeeFile[]>([]);
  const [docTypes, setDocTypes] = useState<DocumentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  // Subida
  const [uploadOpen, setUploadOpen] = useState(false);
  const [typeId, setTypeId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Borrado
  const [deleteTarget, setDeleteTarget] = useState<EmployeeFile | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadFiles = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/human-capital/employees/${employeeId}/documents`);
      const data = (await response.json().catch(() => null)) as { data?: EmployeeFile[]; message?: string } | null;

      if (!response.ok || !data?.data) {
        throw new Error(data && data.message ? data.message : 'No se pudieron cargar los documentos.');
      }

      setFiles(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar documentos.');
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  const loadDocTypes = useCallback(async () => {
    try {
      const response = await fetch('/api/human-capital/catalogs/document-types');
      const data = (await response.json().catch(() => null)) as { data?: DocumentType[] } | null;

      if (response.ok && data?.data) setDocTypes(data.data);
    } catch {
      // El Select quedará vacío; el submit lo bloquea igualmente.
    }
  }, []);

  useEffect(() => {
    loadFiles();
    loadDocTypes();
  }, [loadFiles, loadDocTypes]);

  const openUpload = () => {
    setTypeId('');
    setFile(null);
    setUploadError(null);
    setUploadOpen(true);
  };

  const closeUpload = () => {
    if (uploading) return;
    setUploadOpen(false);
    setTypeId('');
    setFile(null);
    setUploadError(null);
  };

  const submitUpload = async () => {
    if (!typeId) {
      setUploadError('Selecciona el tipo de documento.');

      return;
    }

    if (!file) {
      setUploadError('Selecciona un archivo.');

      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      const fd = new FormData();

      fd.append('file', file);
      fd.append('documentTypeId', typeId);

      const response = await fetch(`/api/human-capital/employees/${employeeId}/documents`, { method: 'POST', body: fd });
      const data = (await response.json().catch(() => null)) as { message?: string } | null;

      if (!response.ok) {
        throw new Error(data && data.message ? data.message : 'No se pudo subir el documento.');
      }

      setUploadOpen(false);
      setTypeId('');
      setFile(null);
      setFeedback({ type: 'success', message: 'Documento subido.' });

      await loadFiles();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Error al subir el documento.');
    } finally {
      setUploading(false);
    }
  };

  const submitDelete = async () => {
    if (!deleteTarget) return;

    const target = deleteTarget;

    setDeleting(true);

    try {
      const response = await fetch(`/api/human-capital/employees/${employeeId}/documents/${target.fileId}`, {
        method: 'DELETE'
      });

      const data = (await response.json().catch(() => null)) as { message?: string } | null;

      if (!response.ok) {
        throw new Error(data && data.message ? data.message : 'No se pudo eliminar el documento.');
      }

      setDeleteTarget(null);
      setFeedback({ type: 'success', message: 'Documento eliminado.' });

      await loadFiles();
    } catch (err) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Error al eliminar el documento.' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Stack spacing={3}>
      {feedback ? (
        <Alert severity={feedback.type} onClose={() => setFeedback(null)}>
          {feedback.message}
        </Alert>
      ) : null}

      {canCreate ? (
        <Stack direction='row' justifyContent='flex-end'>
          <Button variant='contained' startIcon={<i className='ri-upload-2-line' />} onClick={openUpload}>
            Subir documento
          </Button>
        </Stack>
      ) : null}

      {loading ? (
        <Stack alignItems='center' sx={{ py: 4 }}>
          <CircularProgress />
        </Stack>
      ) : error ? (
        <Alert severity='error'>{error}</Alert>
      ) : files.length === 0 ? (
        <Typography variant='body2' color='text.secondary' sx={{ py: 2 }}>
          Sin documentos registrados.
        </Typography>
      ) : (
        <TableContainer component={Paper} variant='outlined'>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Tipo de documento</TableCell>
                <TableCell align='right'>Acciones</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {files.map(f => (
                <TableRow key={f.fileId} hover>
                  <TableCell>{f.documentTypeName ?? '—'}</TableCell>
                  <TableCell align='right'>
                    <Tooltip title='Abrir'>
                      <span>
                        <IconButton
                          component='a'
                          href={f.url}
                          target='_blank'
                          rel='noopener noreferrer'
                          disabled={!f.url}
                        >
                          <i className='ri-external-link-line' />
                        </IconButton>
                      </span>
                    </Tooltip>
                    {canDelete ? (
                      <Tooltip title='Eliminar'>
                        <IconButton color='error' onClick={() => setDeleteTarget(f)}>
                          <i className='ri-delete-bin-line' />
                        </IconButton>
                      </Tooltip>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={uploadOpen} onClose={closeUpload} maxWidth='xs' fullWidth>
        <DialogTitle>Subir documento</DialogTitle>

        <DialogContent>
          <Stack spacing={3} sx={{ pt: 1 }}>
            {uploadError ? <Alert severity='error'>{uploadError}</Alert> : null}

            <FormControl fullWidth disabled={uploading}>
              <InputLabel id='doctype-label'>Tipo de documento</InputLabel>
              <Select
                labelId='doctype-label'
                label='Tipo de documento'
                value={typeId}
                onChange={e => setTypeId(String(e.target.value))}
              >
                {docTypes.map(dt => (
                  <MenuItem key={dt.id} value={String(dt.id)}>
                    {dt.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <input
              ref={fileInputRef}
              type='file'
              hidden
              accept='.jpg,.jpeg,.png,.pdf'
              onChange={e => setFile(e.target.files?.[0] ?? null)}
            />

            <Stack direction='row' spacing={2} alignItems='center'>
              <Button variant='outlined' onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                Elegir archivo
              </Button>
              <Typography variant='body2' color='text.secondary' noWrap>
                {file ? file.name : 'JPG, PNG o PDF (máx. 10 MB)'}
              </Typography>
            </Stack>
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={closeUpload} disabled={uploading}>
            Cancelar
          </Button>
          <Button
            variant='contained'
            onClick={submitUpload}
            disabled={uploading}
            startIcon={uploading ? <CircularProgress size={18} color='inherit' /> : null}
          >
            {uploading ? 'Subiendo...' : 'Subir'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onClose={() => (deleting ? null : setDeleteTarget(null))} maxWidth='xs' fullWidth>
        <DialogTitle>Eliminar documento</DialogTitle>

        <DialogContent>
          <Typography variant='body2'>
            ¿Eliminar el documento <strong>{deleteTarget?.documentTypeName ?? ''}</strong>? Esta acción es permanente.
          </Typography>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleting}>
            Cancelar
          </Button>
          <Button
            variant='contained'
            color='error'
            onClick={submitDelete}
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={18} color='inherit' /> : null}
          >
            {deleting ? 'Eliminando...' : 'Eliminar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};

export default DocumentsTab;
