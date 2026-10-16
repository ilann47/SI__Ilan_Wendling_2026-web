import { useState, type ComponentProps, type KeyboardEvent } from 'react';
import { TextField } from '@mui/material';

export function normalizeNumericInput(value: string): string {
  return value.replace(/^(-?)0+(?=\d)/, '$1');
}

type TextFieldProps = ComponentProps<typeof TextField>;

interface NumberFieldProps extends Omit<TextFieldProps, 'type' | 'value' | 'onChange'> {
  value: string | number;
  onValueChange: (value: string) => void;
  min?: number;
  max?: number;
  step?: number | string;
}

/** Campo numérico controlado com as mesmas regras de digitação e feedback em todos os fluxos. */
export function NumberField({
  value,
  onValueChange,
  min,
  max,
  step = 1,
  helperText,
  error,
  inputProps,
  onKeyDown,
  ...props
}: NumberFieldProps) {
  const [localError, setLocalError] = useState<string | null>(null);
  const minimumMessage = min === undefined ? null : `O valor mínimo é ${min}.`;
  const maximumMessage = max === undefined ? null : `O valor máximo é ${max}.`;

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (['e', 'E', '+'].includes(event.key)) event.preventDefault();
    if (event.key === '-' && min !== undefined && min >= 0) {
      event.preventDefault();
      setLocalError(minimumMessage);
    }
    onKeyDown?.(event);
  };

  return (
    <TextField
      {...props}
      type="number"
      value={value}
      onKeyDown={handleKeyDown}
      onChange={(event) => {
        const next = normalizeNumericInput(event.target.value);
        const parsed = Number(next);
        if (next !== '' && min !== undefined && Number.isFinite(parsed) && parsed < min) {
          setLocalError(minimumMessage);
          return;
        }
        if (next !== '' && max !== undefined && Number.isFinite(parsed) && parsed > max) {
          setLocalError(maximumMessage);
          return;
        }
        setLocalError(null);
        onValueChange(next);
      }}
      error={error || !!localError}
      helperText={localError ?? helperText}
      inputProps={{
        ...inputProps,
        min,
        max,
        step,
        inputMode: step === 1 ? 'numeric' : 'decimal',
      }}
    />
  );
}
