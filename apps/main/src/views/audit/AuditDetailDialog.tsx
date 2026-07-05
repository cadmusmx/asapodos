'use client'

// MUI Imports
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';

// Diff logic
import { diffJson, formatValue, type DiffStatus } from '@/lib/audit/diff';

type Props = {
  open: boolean;
  onClose: () => void;
  oldData: string | null;
  newData: string | null;
}

// Color de fondo por estado de cambio (usa variables del tema MUI).
const statusBg: Record<DiffStatus, string> = {
  added: 'rgba(var(--mui-palette-success-mainChannel) / 0.12)',
  removed: 'rgba(var(--mui-palette-error-mainChannel) / 0.12)',
  modified: 'rgba(var(--mui-palette-warning-mainChannel) / 0.12)',
  unchanged: 'transparent'
}

const statusLabel: Record<DiffStatus, string> = {
  added: 'Agregado',
  removed: 'Eliminado',
  modified: 'Modificado',
  unchanged: ''
}

const AuditDetailDialog = ({ open, onClose, oldData, newData }: Props) => {
  const hasOld = oldData != null && oldData !== '';
  const hasNew = newData != null && newData !== '';

  // Modo diff solo cuando AMBOS tienen datos. Si no, mostramos el único presente.
  const isDiff = hasOld && hasNew;
  const rows = isDiff ? diffJson(oldData, newData) : [];

  // Para los casos de un solo lado: el objeto a mostrar tal cual.
  const singleData = hasNew ? newData : hasOld ? oldData : null;
  const singleTitle = hasNew ? 'Datos del evento' : 'Datos eliminados';

  return (
    <Dialog open={open} onClose={onClose} maxWidth='md' fullWidth>
      <DialogTitle>
        {isDiff ? 'Cambios registrados' : singleTitle}
      </DialogTitle>
      <DialogContent dividers>
        {isDiff ? (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: 8 }}>Campo</th>
                <th style={{ textAlign: 'left', padding: 8 }}>Antes</th>
                <th style={{ textAlign: 'left', padding: 8 }}>Después</th>
                <th style={{ textAlign: 'left', padding: 8 }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.key} style={{ background: statusBg[r.status] }}>
                  <td style={{ padding: 8, fontFamily: 'monospace', verticalAlign: 'top' }}>{r.key}</td>
                  <td style={{ padding: 8, fontFamily: 'monospace', verticalAlign: 'top', wordBreak: 'break-all' }}>
                    {r.status === 'added' ? '' : formatValue(r.oldValue)}
                  </td>
                  <td style={{ padding: 8, fontFamily: 'monospace', verticalAlign: 'top', wordBreak: 'break-all' }}>
                    {r.status === 'removed' ? '' : formatValue(r.newValue)}
                  </td>
                  <td style={{ padding: 8, verticalAlign: 'top' }}>
                    {statusLabel[r.status] && (
                      <Chip
                        size='small'
                        variant='tonal'
                        label={statusLabel[r.status]}
                        color={
                          r.status === 'added' ? 'success' : r.status === 'removed' ? 'error' : 'warning'
                        }
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : singleData ? (
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: 13 }}>
            {prettyPrint(singleData)}
          </pre>
        ) : (
          <Typography color='text.secondary'>Sin datos.</Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  )
}

// Formatea un string JSON de forma legible; si no es JSON válido, lo deja tal cual.
function prettyPrint(s: string): string {
  try {
    return JSON.stringify(JSON.parse(s), null, 2);
  } catch {
    return s;
  }
}

export default AuditDetailDialog;
