// apps/main/src/app/[lang]/(dashboard)/(private)/human-capital/employees/[id]/ContactsTab.tsx
'use client';

import { useCallback, useEffect, useState } from 'react';

import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
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

type Contact = {
  contactId: number;
  name: string;
  phone: string | null;
  relationshipId: number | null;
  relationshipName: string | null;
  esPrioritario: boolean;
};

type ContactsTabProps = {
  employeeId: number;
};

const ContactsTab = ({ employeeId }: ContactsTabProps) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadContacts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/human-capital/employees/${employeeId}/contacts`);
      const data = (await response.json().catch(() => null)) as { data?: Contact[]; message?: string } | null;

      if (!response.ok || !data?.data) {
        throw new Error(data && data.message ? data.message : 'No se pudieron cargar los contactos.');
      }

      setContacts(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar contactos.');
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

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

  if (contacts.length === 0) {
    return (
      <Typography variant='body2' color='text.secondary' sx={{ py: 2 }}>
        Sin contactos registrados.
      </Typography>
    );
  }

  return (
    <TableContainer component={Paper} variant='outlined'>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Nombre</TableCell>
            <TableCell>Teléfono</TableCell>
            <TableCell>Parentesco</TableCell>
            <TableCell></TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {contacts.map(contact => (
            <TableRow key={contact.contactId} hover>
              <TableCell>{contact.name}</TableCell>
              <TableCell>{contact.phone ?? '—'}</TableCell>
              <TableCell>{contact.relationshipName ?? '—'}</TableCell>
              <TableCell>
                {contact.esPrioritario ? <Chip label='Prioritario' color='primary' size='small' /> : null}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default ContactsTab;
