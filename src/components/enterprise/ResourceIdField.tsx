import { Button, MenuItem, Stack, TextField } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import type { WorkspaceResource } from '../../workspace/workspaceStore';
import { NumberField } from '../form/NumberField';

interface ResourceIdFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  recent?: WorkspaceResource[];
  required?: boolean;
}

export function ResourceIdField({ label, value, onChange, recent = [], required = true }: ResourceIdFieldProps) {
  const options = useMemo(() => recent.slice(0, 20), [recent]);
  const selected = options.some((resource) => String(resource.id) === value);
  const [manual, setManual] = useState(() => options.length === 0 || (!!value && !selected));

  useEffect(() => {
    if (selected) setManual(false);
    else if (options.length === 0) setManual(true);
  }, [options.length, selected]);

  if (!manual && options.length > 0) {
    return (
      <Stack spacing={0.5}>
        <TextField
          select
          label={label}
          value={selected ? value : ''}
          onChange={(event) => onChange(event.target.value)}
          required={required}
          fullWidth
          helperText="Escolha uma opção usada recentemente."
        >
          <MenuItem value="" disabled>Selecione</MenuItem>
          {options.map((resource) => (
            <MenuItem key={resource.id} value={String(resource.id)}>{resource.label}</MenuItem>
          ))}
        </TextField>
        <Button size="small" variant="text" onClick={() => setManual(true)} sx={{ alignSelf: 'flex-start' }}>
          Informar outro código
        </Button>
      </Stack>
    );
  }

  return (
    <Stack spacing={0.5}>
      <NumberField
        label={`Código de referência — ${label}`}
        value={value}
        onValueChange={onChange}
        min={1}
        required={required}
        fullWidth
        helperText={`Ainda não há opções recentes para ${label.toLowerCase()}. Informe o código somente quando necessário.`}
      />
      {options.length > 0 && (
        <Button size="small" variant="text" onClick={() => { onChange(''); setManual(false); }} sx={{ alignSelf: 'flex-start' }}>
          Escolher entre os recentes
        </Button>
      )}
    </Stack>
  );
}
