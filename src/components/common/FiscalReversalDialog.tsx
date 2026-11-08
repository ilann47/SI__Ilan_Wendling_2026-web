import { Alert, Box, Button, Stack, TextField } from '@mui/material';
import { useId, useState } from 'react';
import { AppDialog } from './AppDialog';

interface Props {
  busy: boolean;
  error?: string | null;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

const maxReasonLength = 500;

export function FiscalReversalDialog({ busy, error, onClose, onConfirm }: Props) {
  const [reason, setReason] = useState('');
  const formId = useId();
  return <AppDialog open onClose={onClose} title="Reverter nota internamente" maxWidth="sm" busy={busy}
    actions={<>
      <Button disabled={busy} onClick={onClose}>Voltar</Button>
      <Button form={formId} type="submit" color="error" variant="contained" disabled={busy || !reason.trim()}>
        Registrar reversão
      </Button>
    </>}>
    <Box component="form" id={formId} onSubmit={(event) => {
      event.preventDefault();
      if (!busy && reason.trim() && reason.trim().length <= maxReasonLength) onConfirm(reason.trim());
    }}>
      <Stack spacing={2}>
        <Alert severity="warning">
          A reversão compensa os movimentos de estoque e cancela as parcelas ainda não baixadas, preservando o histórico.
          O sistema verifica se a nota ainda pode ser revertida. Não é cancelamento fiscal externo.
        </Alert>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField label="Motivo da reversão" value={reason} onChange={(event) => setReason(event.target.value)}
          disabled={busy} required multiline minRows={2} fullWidth inputProps={{ maxLength: maxReasonLength }} />
      </Stack>
    </Box>
  </AppDialog>;
}
