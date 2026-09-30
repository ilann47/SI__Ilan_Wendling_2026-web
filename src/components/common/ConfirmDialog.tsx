import {
  Button,
} from '@mui/material';
import { AppDialog } from './AppDialog';

interface Props {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  confirmColor?: 'primary' | 'error' | 'warning' | 'success' | 'inherit';
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({
  open,
  title = 'Confirmar',
  message,
  confirmLabel = 'Confirmar',
  confirmColor = 'primary',
  loading,
  onConfirm,
  onClose,
}: Props) {
  return (
    <AppDialog
      open={open}
      onClose={onClose}
      title={title}
      maxWidth="xs"
      role="alertdialog"
      busy={loading}
      contentDividers={false}
      actions={(
        <>
        <Button onClick={onClose} color="inherit" disabled={loading} autoFocus>
          Cancelar
        </Button>
        <Button onClick={onConfirm} variant="contained" color={confirmColor} disabled={loading}>
          {confirmLabel}
        </Button>
        </>
      )}
    >
      {message}
    </AppDialog>
  );
}
