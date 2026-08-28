'use client';

import { useEffect, useRef, useState } from 'react';

import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';

type Reason = 'VALID' | 'ALREADY_EXTENDED' | 'NOT_FOUND' | 'NOT_IN';

interface VerifyResp {
  success: boolean;
  reason?: Reason;
  folio?: string;
  folioSalida?: string;
}

// Mensajes de dominio en español (los reason son códigos internos).
const MESSAGES: Record<Exclude<Reason, 'VALID'>, string> = {
  ALREADY_EXTENDED: 'Ya se registró una salida.',
  NOT_FOUND: 'No se encontró una entrada con ese folio.',
  NOT_IN: 'El folio no corresponde a una entrada.',
};

/**
 * Salida por folio de entrada (S2 · modal manual).
 * El input recibe folio tecleado, folio escaneado como texto,
 * o el deeplink del QR de entrada (gasosaas://mv/VME-…) — el server normaliza cualquier origen.
 * Los escáneres HID envían Enter al final: por eso valida en Enter (y botón),
 * con el input en foco al abrir para que el escaneo caiga ahí.
 */
const OutFolioModal = ({ open, onClose, lang }: { open: boolean; onClose: () => void; lang: string }) => {
  const [raw, setRaw] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<VerifyResp | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset + foco al abrir.
  useEffect(() => {
    if (!open) return;

    setRaw('');
    setResult(null);
    setBusy(false);

    const t = setTimeout(() => inputRef.current?.focus(), 0);

    return () => clearTimeout(t);
  }, [open]);

  const detailUrl = (f: string) => `/${lang}/warehouses/material-validation/${encodeURIComponent(f)}`;

  const verify = async () => {
    const value = raw.trim();

    if (!value || busy) return;

    setBusy(true);
    setResult(null);

    try {
      const res = await fetch(`/api/warehouses/material-validation/verify-folio?folio=${encodeURIComponent(value)}`);
      const data = (await res.json()) as VerifyResp;

      if (!res.ok || !data.success) throw new Error('verify');

      if (data.reason === 'VALID' && data.folio) {
        window.open(`${detailUrl(data.folio)}/out`, '_blank', 'noopener,noreferrer');
        onClose();

        return;
      }

      setResult(data);

      // Reselecciona el texto para el siguiente escaneo.
      setTimeout(() => inputRef.current?.select(), 0);
    } catch {
      setResult({ success: true, reason: 'NOT_FOUND' });
      setTimeout(() => inputRef.current?.select(), 0);
    } finally {
      setBusy(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      verify();
    }
  };

  const reason = result?.reason && result.reason !== 'VALID' ? result.reason : null;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth='xs'>
      <DialogTitle>Salida por folio de entrada</DialogTitle>
      <DialogContent>
        <Typography variant='body2' color='text.secondary' className='mbe-3'>
          Escanea el QR de la entrada o teclea su folio.
        </Typography>

        <TextField
          inputRef={inputRef}
          label='Folio de entrada'
          fullWidth
          value={raw}
          onChange={e => setRaw(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={busy}
          autoFocus
        />

        {reason && (
          <Alert
            severity={reason === 'ALREADY_EXTENDED' ? 'info' : 'warning'}
            className='mbs-3'
            action={
              reason === 'ALREADY_EXTENDED' && result?.folioSalida ? (
                <Button
                  color='inherit'
                  size='small'
                  onClick={() => window.open(detailUrl(result.folioSalida!), '_blank', 'noopener,noreferrer')}
                >
                  Ver salida
                </Button>
              ) : undefined
            }
          >
            {MESSAGES[reason]}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button color='secondary' onClick={onClose} disabled={busy}>Cerrar</Button>
        <Button variant='contained' onClick={verify} disabled={busy || !raw.trim()}>
          {busy ? 'Verificando…' : 'Verificar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default OutFolioModal;
