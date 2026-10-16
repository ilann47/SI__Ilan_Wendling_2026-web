import { Controller, useFormContext, useWatch } from 'react-hook-form';
import {
  Box,
  Divider,
  FormControlLabel,
  InputAdornment,
  MenuItem,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import type { FieldConfig } from './fieldConfig';
import { ReferenceSelect } from './ReferenceSelect';
import { PurchaseCostsSummary, SubItemsEditor } from './SubItemsEditor';
import { DocumentField } from './DocumentField';
import { normalizeNumericInput } from './NumberField';

interface Props {
  field: FieldConfig;
  namePrefix?: string;
  dense?: boolean;
}

const NUMERIC: FieldConfig['type'][] = ['number', 'integer', 'money', 'percent'];

export { normalizeNumericInput } from './NumberField';

export function FieldRenderer({ field, namePrefix = '', dense }: Props) {
  const { clearErrors, control, setError, setValue } = useFormContext();
  const formValues = useWatch({ control }) as Record<string, unknown>;
  const disabled = field.disabled || field.disabledWhen?.(formValues);
  const name = `${namePrefix}${field.name}`;
  const size = dense ? 'small' : 'small';
  const isNumeric = NUMERIC.includes(field.type);
  const isMoney = field.type === 'money';
  const isPercent = field.type === 'percent';
  const minimum = isNumeric ? field.min ?? 0 : undefined;
  const maximum = isNumeric ? field.max ?? (isPercent ? 100 : undefined) : undefined;
  const dependencies = field.dependsOn?.map((dependency) => `${namePrefix}${dependency}`);
  const rules = {
    required: field.required ? 'Campo obrigatório' : false,
    ...(dependencies?.length ? { deps: dependencies } : {}),
    ...(isNumeric ? {
      validate: (value: unknown) => {
        if (value === '' || value === undefined || value === null) return true;
        const parsed = Number(value);
        if (!Number.isFinite(parsed)) return 'Informe um número válido.';
        if (field.type === 'integer' && !Number.isInteger(parsed)) return 'Informe um número inteiro.';
        if (minimum !== undefined && parsed < minimum) return `O valor mínimo é ${minimum}.`;
        if (maximum !== undefined && parsed > maximum) return `O valor máximo é ${maximum}.`;
        return field.validate?.(value, formValues, namePrefix) ?? true;
      },
    } : field.validate ? {
      validate: (value: unknown) => field.validate?.(value, formValues, namePrefix) ?? true,
    } : {}),
  };

  if (field.type === 'section') {
    return (
      <Box sx={{ pt: 0.5 }}>
        <Typography variant="subtitle1" fontWeight={700}>{field.label}</Typography>
        {field.helperText && (
          <Typography variant="body2" color="text.secondary">{field.helperText}</Typography>
        )}
        <Divider sx={{ mt: 1 }} />
      </Box>
    );
  }

  if (field.type === 'subitems' && field.subFields) {
    return <SubItemsEditor name={name} label={field.label} subFields={field.subFields}
      summary={field.subItemsSummary} disabled={disabled} />;
  }

  if (field.type === 'subitems-summary' && field.subItemsSummary === 'purchase-costs') {
    return <PurchaseCostsSummary />;
  }

  if (field.type === 'document') {
    return <DocumentField field={field} namePrefix={namePrefix} dense={dense} />;
  }

  if (field.type === 'switch') {
    return (
      <Controller
        name={name}
        control={control}
        render={({ field: f }) => (
          <FormControlLabel
            control={(
              <Switch
                checked={!!f.value}
                onChange={(e) => f.onChange(e.target.checked)}
                disabled={disabled}
              />
            )}
            label={field.label}
          />
        )}
      />
    );
  }

  if (field.type === 'reference' && field.reference) {
    return (
      <Controller
        name={name}
        control={control}
        rules={rules}
        render={({ field: f, fieldState }) => (
          <ReferenceSelect
            label={field.label}
            value={f.value ?? null}
            onChange={(value, option) => {
              f.onChange(value);
              const inherited = field.reference?.inheritFields;
              if (!inherited || (value != null && !option)) return;
              for (const [source, target] of Object.entries(inherited)) {
                setValue(`${namePrefix}${target}`, value == null ? '' : option?.[source] ?? '', {
                  shouldDirty: true,
                  shouldTouch: true,
                  shouldValidate: true,
                });
              }
            }}
            reference={field.reference!}
            required={field.required}
            disabled={disabled}
            error={fieldState.error?.message}
            helperText={field.helperText}
            reserveHelperSpace={dense}
          />
        )}
      />
    );
  }

  if (field.type === 'date') {
    return (
      <Controller
        name={name}
        control={control}
        rules={rules}
        render={({ field: f, fieldState }) => (
          <DatePicker
            disabled={disabled}
            label={field.label}
            value={f.value ? dayjs(f.value) : null}
            onChange={(d) => f.onChange(d && d.isValid() ? d.format('YYYY-MM-DD') : undefined)}
            slotProps={{
              popper: {
                sx: (theme) => ({ zIndex: theme.zIndex.modal + 1 }),
              },
              textField: {
                fullWidth: true,
                size,
                required: field.required,
                error: !!fieldState.error,
                helperText: fieldState.error?.message || field.helperText || (dense ? ' ' : undefined),
                FormHelperTextProps: dense ? { sx: { minHeight: '1.25rem', mt: 0.5 } } : undefined,
              },
            }}
          />
        )}
      />
    );
  }

  if (field.type === 'select') {
    return (
      <Controller
        name={name}
        control={control}
        rules={rules}
        render={({ field: f, fieldState }) => (
          <TextField
            select
            fullWidth
            size={size}
            label={field.label}
            required={field.required}
            disabled={disabled}
            value={f.value ?? ''}
            onChange={(e) => f.onChange(e.target.value === '' ? undefined : e.target.value)}
            error={!!fieldState.error}
            helperText={fieldState.error?.message || field.helperText || (dense ? ' ' : undefined)}
            FormHelperTextProps={dense ? { sx: { minHeight: '1.25rem', mt: 0.5 } } : undefined}
          >
            <MenuItem value="">
              <em>—</em>
            </MenuItem>
            {(field.options ?? []).map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>
        )}
      />
    );
  }

  // Cadastro em CAIXA ALTA: campos de texto viram maiúsculo ao digitar.
  // Exceção: senha (type 'password', quebraria o login) e e-mail.
  const upper = (field.type === 'text' || field.type === 'textarea') && field.name !== 'email';

  return (
    <Controller
      name={name}
      control={control}
      rules={rules}
      render={({ field: f, fieldState }) => (
        <TextField
          fullWidth
          size={size}
          label={field.label}
          required={field.required}
          disabled={disabled}
          type={field.type === 'password' ? 'password' : isNumeric ? 'number' : 'text'}
          multiline={field.type === 'textarea'}
          minRows={field.type === 'textarea' ? 2 : undefined}
          value={f.value ?? ''}
          onFocus={(event) => {
            if (isNumeric && (f.value === 0 || f.value === '0')) event.target.select();
          }}
          onKeyDown={(event) => {
            if (!isNumeric) return;
            if (['e', 'E', '+'].includes(event.key)
              || (event.key === '-' && minimum !== undefined && minimum >= 0)) {
              event.preventDefault();
            }
          }}
          onChange={(e) => {
            const v = e.target.value;
            if (isNumeric) {
              if (v.startsWith('-') && minimum !== undefined && minimum >= 0) {
                setError(name, { type: 'min', message: `O valor mínimo é ${minimum}.` });
                return;
              }
              clearErrors(name);
              f.onChange(v === '' ? undefined : normalizeNumericInput(v));
            }
            else f.onChange(upper ? v.toUpperCase() : v);
          }}
          inputProps={{
            ...(isNumeric ? {
              step: field.step ?? (field.type === 'integer' ? 1 : 0.01),
              min: minimum,
              max: maximum,
              inputMode: field.type === 'integer' ? 'numeric' : 'decimal',
            } : {}),
            ...(upper ? { style: { textTransform: 'uppercase' } } : {}),
          }}
          error={!!fieldState.error}
          helperText={fieldState.error?.message || field.helperText || (dense ? ' ' : undefined)}
          FormHelperTextProps={dense ? { sx: { minHeight: '1.25rem', mt: 0.5 } } : undefined}
          InputProps={{
            startAdornment: isMoney ? <InputAdornment position="start">R$</InputAdornment> : undefined,
            endAdornment: isPercent ? <InputAdornment position="end">%</InputAdornment> : undefined,
          }}
        />
      )}
    />
  );
}
