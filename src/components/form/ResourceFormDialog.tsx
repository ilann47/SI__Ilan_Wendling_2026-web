import { useEffect, useId, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  type DialogProps,
} from '@mui/material';
import { FormProvider, useForm } from 'react-hook-form';
import { type FieldConfig, defaultValueFor } from './fieldConfig';
import { FieldRenderer } from './FieldRenderer';
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

function buildDefaults(fields: FieldConfig[], initial?: Record<string, unknown> | null) {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    const v = initial?.[f.name];
    out[f.name] = v !== undefined && v !== null ? v : defaultValueFor(f);
  }
  return out;
}

export function buildResourcePayload(
  fields: FieldConfig[],
  values: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const field of fields) {
    if (field.disabled || field.type === 'section' || field.type === 'subitems-summary') continue;
    const v = values[field.name];
    if (v === '' || v === undefined) continue;
    out[field.name] = v;
  }
  return out;
}

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
      methods.reset(buildDefaults(fields, initialValues));
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
            <Button onClick={requestClose} color="inherit" disabled={submitting}>
              Cancelar
            </Button>
            <Button form={formId} type="submit" variant="contained"
              disabled={submitting || !isValid || Object.keys(errors).length > 0}>
              {submitLabel}
            </Button>
          </>
        )}
      >
          <Box component="form" id={formId} onSubmit={submit} noValidate>
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
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(12, 1fr)' },
                gap: 2,
                pt: 1,
              }}
            >
              {fields.map((f) => {
                const cols = f.type === 'subitems' || f.type === 'subitems-summary'
                  || f.type === 'textarea' || f.type === 'section'
                  ? 12
                  : f.cols ?? 6;
                const renderedField = initialValues && f.disabledOnEdit
                  ? { ...f, disabled: true }
                  : f;
                return (
                  <Box key={f.name} sx={{ gridColumn: { sm: `span ${cols}` } }}>
                    <FieldRenderer field={renderedField} />
                  </Box>
                );
              })}
            </Box>
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
