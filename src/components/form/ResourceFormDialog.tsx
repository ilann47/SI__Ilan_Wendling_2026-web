import { useEffect, useId, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  type DialogProps,
} from '@mui/material';
import { FormProvider, useForm } from 'react-hook-form';
import type { FieldConfig } from './fieldConfig';
import { ResourceFormFields, buildResourceDefaults, buildResourcePayload } from './ResourceFormFields';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { AppDialog } from '../common/AppDialog';

interface Props {
  open: boolean;
  title: string;
  submitLabel?: string;
  fields: FieldConfig[];
  initialValues?: Record<string, unknown> | null;
  submitting?: boolean;
  conflictMessage?: string | null;
  onReload?: () => void;
  reloading?: boolean;
  resetKey?: number;
  confirmDiscard?: boolean;
  maxWidth?: DialogProps['maxWidth'];
  onClose: () => void;
  onSubmit: (values: Record<string, unknown>) => void;
}

export { buildResourcePayload } from './ResourceFormFields';

export function ResourceFormDialog({
  open,
  title,
  submitLabel = 'Salvar',
  fields,
  initialValues,
  submitting,
  conflictMessage,
  onReload,
  reloading,
  resetKey,
  confirmDiscard = true,
  maxWidth = 'md',
  onClose,
  onSubmit,
}: Props) {
  const methods = useForm<Record<string, unknown>>({
    defaultValues: {},
    mode: 'onChange',
    reValidateMode: 'onChange',
  });
  const [discardOpen, setDiscardOpen] = useState(false);
  const formId = useId();
  const { errors, isDirty, isValid } = methods.formState;

  useEffect(() => {
    if (open) {
      methods.reset(buildResourceDefaults(fields, initialValues));
      setDiscardOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, resetKey]);

  const submit = methods.handleSubmit((values) => onSubmit(buildResourcePayload(fields, values)));
  const requestClose = () => {
    if (confirmDiscard && isDirty) {
      setDiscardOpen(true);
      return;
    }
    onClose();
  };

  return (
    <>
      <FormProvider {...methods}>
      <AppDialog
        open={open}
        onClose={requestClose}
        title={title}
        maxWidth={maxWidth}
        fullScreenOnMobile
        busy={submitting}
        actions={(
          <>
            <Button onClick={requestClose} variant="outlined" disabled={submitting}>
              Cancelar
            </Button>
            <Button form={formId} type="submit" variant="contained"
              disabled={submitting || !isValid || Object.keys(errors).length > 0}
              aria-busy={!!submitting}
              aria-label={submitting ? 'Salvando…' : undefined}
              startIcon={submitting ? (
                <CircularProgress size={16} thickness={5} color="inherit" aria-label="Salvando cadastro" />
              ) : undefined}>
              {submitting ? 'Salvando…' : submitLabel}
            </Button>
          </>
        )}
      >
          <Box
            component="form"
            id={formId}
            aria-label={typeof title === 'string' ? title : 'Formulário'}
            aria-busy={!!submitting}
            onSubmit={submit}
            noValidate
          >
            {conflictMessage && (
              <Alert
                severity="warning"
                sx={{ mb: 2 }}
                action={onReload ? (
                  <Button color="inherit" size="small" onClick={onReload} disabled={reloading}>
                    {reloading ? <CircularProgress size={16} color="inherit" /> : 'Recarregar dados'}
                  </Button>
                ) : undefined}
              >
                {conflictMessage}
              </Alert>
            )}
            <ResourceFormFields fields={fields} editing={!!initialValues} />
          </Box>
      </AppDialog>
      </FormProvider>
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
