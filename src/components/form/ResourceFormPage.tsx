import { Button } from '@mui/material';
import { useEffect, useRef } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { FormPage } from './FormPage';
import type { FieldConfig } from './fieldConfig';
import { ResourceFormFields, buildResourceDefaults, buildResourcePayload } from './ResourceFormFields';

interface Props<Result> {
  title: string;
  subtitle?: string;
  fields: FieldConfig[];
  submitting?: boolean;
  submitDisabled?: boolean;
  error?: string | null;
  initialValues?: Record<string, unknown> | null;
  resetKey?: number;
  onReload?: () => void;
  reloading?: boolean;
  discardLabel?: string;
  guardNavigation?: boolean;
  contextual?: boolean;
  onClose: () => void;
  onSubmit: (values: Record<string, unknown>) => Promise<Result>;
  onSaved?: (result: Result) => void;
}

export function ResourceFormPage<Result>({ title, subtitle, fields, submitting, submitDisabled, error, initialValues, resetKey,
  onReload, reloading, discardLabel, guardNavigation, contextual, onClose, onSubmit, onSaved }: Props<Result>) {
  const form = useForm<Record<string, unknown>>({ defaultValues: buildResourceDefaults(fields, initialValues), mode: 'onChange' });
  const { errors, isDirty, isValid, isSubmitting } = form.formState;
  const { reset } = form;
  const values = useRef({ fields, initialValues });
  values.current = { fields, initialValues };
  useEffect(() => { reset(buildResourceDefaults(values.current.fields, values.current.initialValues)); }, [reset, resetKey]);
  const allowNavigation = useRef(false);
  const saving = useRef(false);
  const busy = submitting || isSubmitting || reloading;

  const submit = form.handleSubmit(async (formValues) => {
    if (saving.current) return;
    saving.current = true;
    try {
      const result = await onSubmit(buildResourcePayload(fields, formValues));
      allowNavigation.current = true;
      if (onSaved) onSaved(result);
      else onClose();
    } catch {
      // A mutação do chamador apresenta a falha e mantém os campos preenchidos.
    } finally {
      saving.current = false;
    }
  });

  return <FormProvider {...form}>
    <FormPage title={title} description={subtitle} busy={busy} dirty={isDirty}
      submitDisabled={!isValid || Object.keys(errors).length > 0 || submitDisabled}
      discardLabel={discardLabel} error={error} guardNavigation={guardNavigation} contextual={contextual}
      navigationAllowed={() => allowNavigation.current} onClose={onClose} onSubmit={submit} noValidate
      recoveryAction={onReload ? <Button color="inherit" size="small" disabled={busy} onClick={onReload}>Recarregar dados</Button> : undefined}>
      <ResourceFormFields fields={fields} editing={!!initialValues} />
    </FormPage>
  </FormProvider>;
}
