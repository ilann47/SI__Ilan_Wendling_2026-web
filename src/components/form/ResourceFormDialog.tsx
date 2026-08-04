import { useEffect } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from '@mui/material';
import { FormProvider, useForm } from 'react-hook-form';
import { type FieldConfig, defaultValueFor } from './fieldConfig';
import { FieldRenderer } from './FieldRenderer';

interface Props {
  open: boolean;
  title: string;
  fields: FieldConfig[];
  initialValues?: Record<string, unknown> | null;
  submitting?: boolean;
  conflictMessage?: string | null;
  onReload?: () => void;
  reloading?: boolean;
  resetKey?: number;
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
    if (field.disabled) continue;
    const v = values[field.name];
    if (v === '' || v === undefined) continue;
    out[field.name] = v;
  }
  return out;
}

export function ResourceFormDialog({
  open,
  title,
  fields,
  initialValues,
  submitting,
  conflictMessage,
  onReload,
  reloading,
  resetKey,
  onClose,
  onSubmit,
}: Props) {
  const methods = useForm<Record<string, unknown>>({ defaultValues: {} });

  useEffect(() => {
    if (open) methods.reset(buildDefaults(fields, initialValues));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, resetKey]);

  const submit = methods.handleSubmit((values) => onSubmit(buildResourcePayload(fields, values)));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <FormProvider {...methods}>
        <Box component="form" onSubmit={submit} noValidate>
          <DialogTitle>{title}</DialogTitle>
          <DialogContent dividers>
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
                const cols = f.type === 'subitems' || f.type === 'textarea' ? 12 : f.cols ?? 6;
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
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={onClose} color="inherit">
              Cancelar
            </Button>
            <Button type="submit" variant="contained" disabled={submitting}>
              Salvar
            </Button>
          </DialogActions>
        </Box>
      </FormProvider>
    </Dialog>
  );
}
