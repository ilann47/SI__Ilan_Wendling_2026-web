import {
  Alert,
  Button,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useRef, useState, type FormEvent } from 'react';
import { getApiProblem, getHttpStatus } from '../../api/client';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import {
  DEFAULT_ORGANIZATION_FORM,
  digitsOnly,
  formatCnpjMask,
  type OrganizationFormValues,
} from './organizationTypes';

type FieldKey = keyof OrganizationFormValues;
type FieldErrors = Partial<Record<FieldKey, string>>;

const FIELD_ORDER: FieldKey[] = [
  'document', 'legalName', 'tradeName', 'currency', 'timeZone', 'region', 'plan',
];

type Props = {
  title: string;
  description: string;
  submitLabel: string;
  loading?: boolean;
  secondaryAction?: { label: string; onClick: () => void; disabled?: boolean };
  onSubmit: (values: OrganizationFormValues) => Promise<void>;
  onCancel?: () => void;
};

export function OrganizationForm({
  title,
  description,
  submitLabel,
  loading = false,
  secondaryAction,
  onSubmit,
  onCancel,
}: Props) {
  const [values, setValues] = useState<OrganizationFormValues>(DEFAULT_ORGANIZATION_FORM);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState('');
  const [dirty, setDirty] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const refs = useRef<Partial<Record<FieldKey, HTMLInputElement | null>>>({});

  const setField = (key: FieldKey, value: string) => {
    setDirty(true);
    setValues((current) => ({ ...current, [key]: value }));
  };

  const focusFirstInvalid = (errors: FieldErrors) => {
    const first = FIELD_ORDER.find((key) => errors[key]);
    if (!first) return;
    queueMicrotask(() => refs.current[first]?.focus());
  };

  const validate = (): FieldErrors => {
    const errors: FieldErrors = {};
    const document = digitsOnly(values.document);
    if (!document) errors.document = 'Informe o documento empresarial.';
    else if (document.length !== 14) errors.document = 'Informe um CNPJ com 14 dígitos.';

    if (!values.legalName.trim()) errors.legalName = 'Informe a razão social.';
    else if (values.legalName.trim().length > 160) errors.legalName = 'A razão social pode ter no máximo 160 caracteres.';

    if (values.tradeName.trim().length > 160) errors.tradeName = 'O nome fantasia pode ter no máximo 160 caracteres.';

    if (!values.currency.trim()) errors.currency = 'Informe a moeda.';
    if (!values.timeZone.trim()) errors.timeZone = 'Informe o fuso horário.';
    if (!values.region.trim()) errors.region = 'Informe a região.';
    if (!values.plan.trim()) errors.plan = 'Informe o plano.';
    return errors;
  };

  const applyProblem = (cause: unknown) => {
    const status = getHttpStatus(cause);
    const problem = getApiProblem(cause);
    if (status === 409) {
      setFieldErrors({ document: 'Já existe uma organização com este documento.' });
      setFormError('');
      queueMicrotask(() => refs.current.document?.focus());
      return;
    }
    if (status === 403) {
      setFormError(problem?.detail || problem?.title || 'Você não tem permissão para criar organização.');
      return;
    }
    if (status === 400 && problem?.erros) {
      const next: FieldErrors = {};
      let unknown = false;
      Object.entries(problem.erros).forEach(([key, message]) => {
        if ((FIELD_ORDER as string[]).includes(key)) next[key as FieldKey] = message;
        else if (key === 'documento' || key === 'document') next.document = message;
        else if (key === 'razaoSocial' || key === 'legalName') next.legalName = message;
        else unknown = true;
      });
      setFieldErrors(next);
      if (unknown || Object.keys(next).length === 0) {
        setFormError(problem.detail || problem.title || 'Requisição inválida.');
      } else {
        setFormError('');
        focusFirstInvalid(next);
      }
      return;
    }
    setFormError(
      problem?.detail
      || problem?.title
      || 'Não foi possível criar a organização agora. Tente novamente em alguns instantes.',
    );
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (loading) return;
    setFormError('');
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      focusFirstInvalid(errors);
      return;
    }
    try {
      await onSubmit(values);
      setDirty(false);
    } catch (cause) {
      applyProblem(cause);
    }
  };

  const cancel = () => {
    if (!onCancel) return;
    if (dirty) {
      setConfirmDiscard(true);
      return;
    }
    onCancel();
  };

  const discard = () => {
    setConfirmDiscard(false);
    setDirty(false);
    onCancel?.();
  };

  return (
    <>
    <Stack component="form" spacing={2} onSubmit={(event) => void submit(event)} noValidate>
      <div>
        <Typography variant="h6">{title}</Typography>
        <Typography variant="body2" color="text.secondary">{description}</Typography>
      </div>
      {formError ? <Alert severity="error">{formError}</Alert> : null}
      <TextField
        label="CNPJ / documento empresarial"
        value={values.document}
        onChange={(event) => setField('document', formatCnpjMask(event.target.value))}
        inputRef={(el) => { refs.current.document = el; }}
        error={Boolean(fieldErrors.document)}
        helperText={fieldErrors.document}
        required
        fullWidth
        inputProps={{ inputMode: 'numeric', 'aria-label': 'CNPJ / documento empresarial' }}
      />
      <TextField
        label="Razão social"
        value={values.legalName}
        onChange={(event) => setField('legalName', event.target.value)}
        inputRef={(el) => { refs.current.legalName = el; }}
        error={Boolean(fieldErrors.legalName)}
        helperText={fieldErrors.legalName}
        required
        fullWidth
        inputProps={{ maxLength: 160, 'aria-label': 'Razão social' }}
      />
      <TextField
        label="Nome fantasia"
        value={values.tradeName}
        onChange={(event) => setField('tradeName', event.target.value)}
        inputRef={(el) => { refs.current.tradeName = el; }}
        error={Boolean(fieldErrors.tradeName)}
        helperText={fieldErrors.tradeName || 'Opcional'}
        fullWidth
        inputProps={{ maxLength: 160, 'aria-label': 'Nome fantasia' }}
      />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          label="Moeda"
          value={values.currency}
          onChange={(event) => setField('currency', event.target.value.toUpperCase())}
          inputRef={(el) => { refs.current.currency = el; }}
          error={Boolean(fieldErrors.currency)}
          helperText={fieldErrors.currency}
          required
          fullWidth
          inputProps={{ maxLength: 3, 'aria-label': 'Moeda' }}
        />
        <TextField
          label="Região"
          value={values.region}
          onChange={(event) => setField('region', event.target.value.toUpperCase())}
          inputRef={(el) => { refs.current.region = el; }}
          error={Boolean(fieldErrors.region)}
          helperText={fieldErrors.region}
          required
          fullWidth
          inputProps={{ maxLength: 8, 'aria-label': 'Região' }}
        />
        <TextField
          label="Plano"
          value={values.plan}
          onChange={(event) => setField('plan', event.target.value.toUpperCase())}
          inputRef={(el) => { refs.current.plan = el; }}
          error={Boolean(fieldErrors.plan)}
          helperText={fieldErrors.plan}
          required
          fullWidth
          inputProps={{ maxLength: 30, 'aria-label': 'Plano' }}
        />
      </Stack>
      <TextField
        label="Fuso horário IANA"
        value={values.timeZone}
        onChange={(event) => setField('timeZone', event.target.value)}
        inputRef={(el) => { refs.current.timeZone = el; }}
        error={Boolean(fieldErrors.timeZone)}
        helperText={fieldErrors.timeZone}
        required
        fullWidth
        inputProps={{ maxLength: 60, 'aria-label': 'Fuso horário IANA' }}
      />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
        <Button type="submit" variant="contained" disabled={loading} sx={{ minHeight: 44 }}>
          {loading ? 'Salvando…' : submitLabel}
        </Button>
        {secondaryAction ? (
          <Button
            type="button"
            variant="outlined"
            disabled={loading || secondaryAction.disabled}
            onClick={secondaryAction.onClick}
            sx={{ minHeight: 44 }}
          >
            {secondaryAction.label}
          </Button>
        ) : null}
        {onCancel ? (
          <Button type="button" color="inherit" disabled={loading} onClick={cancel} sx={{ minHeight: 44 }}>
            Cancelar
          </Button>
        ) : null}
      </Stack>
    </Stack>
    <ConfirmDialog
      open={confirmDiscard}
      title="Descartar alterações?"
      message="Os dados preenchidos nesta organização serão perdidos."
      confirmLabel="Descartar"
      confirmColor="error"
      onConfirm={discard}
      onClose={() => setConfirmDiscard(false)}
      cancelLabel="Continuar editando"
    />
    </>
  );
}
