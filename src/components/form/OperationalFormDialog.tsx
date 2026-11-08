import { Alert, Box, Button, CircularProgress, Stack, type DialogProps } from '@mui/material';
import { useState, type FormEvent, type ReactNode } from 'react';
import { AppDialog } from '../common/AppDialog';
import { ConfirmDialog } from '../common/ConfirmDialog';

interface OperationalFormDialogProps {
  open: boolean;
  title: string;
  description?: ReactNode;
  formId: string;
  submitLabel: string;
  submitting?: boolean;
  submitDisabled?: boolean;
  dirty?: boolean;
  error?: string | null;
  maxWidth?: DialogProps['maxWidth'];
  children: ReactNode;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

/** Dialogo para formularios operacionais customizados que nao cabem no CRUD declarativo. */
export function OperationalFormDialog({
  open,
  title,
  description,
  formId,
  submitLabel,
  submitting = false,
  submitDisabled = false,
  dirty = false,
  error,
  maxWidth = 'md',
  children,
  onClose,
  onSubmit,
}: OperationalFormDialogProps) {
  const [discardOpen, setDiscardOpen] = useState(false);
  const requestClose = () => {
    if (submitting) return;
    if (dirty) {
      setDiscardOpen(true);
      return;
    }
    onClose();
  };

  return (
    <>
      <AppDialog
        open={open}
        onClose={requestClose}
        title={title}
        description={description}
        maxWidth={maxWidth}
        fullScreenOnMobile
        busy={submitting}
        actions={(
          <>
            <Button color="inherit" onClick={requestClose} disabled={submitting}>Cancelar</Button>
            <Button type="submit" form={formId} variant="contained" disabled={submitting || submitDisabled}
              startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : undefined}>
              {submitLabel}
            </Button>
          </>
        )}
      >
        <Box component="form" id={formId} onSubmit={onSubmit}>
          <Stack spacing={2}>
            {error && <Alert severity="error" aria-live="polite">{error}</Alert>}
            {children}
          </Stack>
        </Box>
      </AppDialog>
      <ConfirmDialog
        open={discardOpen}
        title="Descartar alterações?"
        message="Os dados preenchidos neste cadastro serão perdidos."
        confirmLabel="Descartar cadastro"
        confirmColor="error"
        onClose={() => setDiscardOpen(false)}
        onConfirm={() => {
          setDiscardOpen(false);
          onClose();
        }}
      />
    </>
  );
}
