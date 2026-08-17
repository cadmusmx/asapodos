'use client';

import { useCallback, useEffect, useState } from 'react';

import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';

type EmployeeFile = {
  fileId: number;
  documentTypeId: number | null;
  documentTypeName: string | null;
  url: string;
  isUrl: boolean;
};

type DocumentsTabProps = {
  employeeId: number;
  canCreate?: boolean;
  canDelete?: boolean;
};

const DocumentsTab = ({ employeeId }: DocumentsTabProps) => {
  const [files, setFiles] = useState<EmployeeFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  if (loading) {
    return (
      <Stack alignItems='center' sx={{ py: 4 }}>
        <CircularProgress />
      </Stack>
    );
  }

  if (error) {
    return <Alert severity='error'>{error}</Alert>;
  }

  if (files.length === 0) {
    return (
      <Typography variant='body2' color='text.secondary' sx={{ py: 2 }}>
        Sin documentos registrados.
      </Typography>
    );
  }

  return (
    <TableContainer component={Paper} variant='outlined'>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Tipo de documento</TableCell>
            <TableCell align='right'>Archivo</TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {files.map(file => (
            <TableRow key={file.fileId} hover>
              <TableCell>{file.documentTypeName ?? '—'}</TableCell>
              <TableCell align='right'>
                <Button
                  size='small'
                  startIcon={<i className='ri-external-link-line' />}
                  href={file.url}
                  target='_blank'
                  rel='noopener noreferrer'
                  disabled={!file.url}
                >
                  Abrir
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default DocumentsTab;
