import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { IconButton, InputAdornment, TextField, Tooltip } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import { api } from '../../api/client';
import type { ReferenceConfig } from './fieldConfig';
import { useQuickCreate } from '../../context/quickCreateCore';
import { ReferencePickerDialog, optionLabel, type RefOption } from './ReferencePickerDialog';

interface Props {
  label: string;
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  reference: ReferenceConfig;
  required?: boolean;
  error?: string;
  disabled?: boolean;
}

/**
 * Campo de referencia: exibe o registro selecionado e abre um seletor
 * (lista + busca + "cadastrar") ao ser clicado. O rotulo do selecionado e
 * resolvido buscando o registro pelo id.
 */
export function ReferenceSelect({ label, value, onChange, reference, required, error, disabled }: Props) {
  const quick = useQuickCreate();
  const singular = quick?.configFor(reference.basePath)?.singular ?? label;
  const [open, setOpen] = useState(false);

  // O valor pode chegar como '' (default do formulario); normaliza para id numerico ou null.
  const parsed = value == null || `${value}`.trim() === '' ? null : Number(value);
  const id = parsed != null && Number.isFinite(parsed) ? parsed : null;

  const { data: selected } = useQuery({
    queryKey: ['reference-one', reference.basePath, id],
    queryFn: () => api.get<RefOption>(`${reference.basePath}/${id}`).then((r) => r.data),
    enabled: id != null,
    staleTime: 60_000,
  });

  const display = id == null ? '' : selected ? optionLabel(selected, reference) : `#${id}`;

  return (
    <>
      <TextField
        fullWidth
        size="small"
        label={label}
        required={required}
        disabled={disabled}
        error={!!error}
        helperText={error}
        placeholder="Selecionar..."
        value={display}
        onClick={() => {
          if (!disabled) setOpen(true);
        }}
        inputProps={{ readOnly: true, style: { cursor: disabled ? 'default' : 'pointer' } }}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              {id != null && !disabled ? (
                <Tooltip title="Limpar">
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onChange(null);
                    }}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              ) : null}
              <IconButton size="small" disabled={disabled} onClick={() => setOpen(true)}>
                <SearchIcon fontSize="small" />
              </IconButton>
            </InputAdornment>
          ),
        }}
      />
      <ReferencePickerDialog
        open={open}
        reference={reference}
        singular={singular}
        value={id}
        onSelect={(selectedId) => onChange(selectedId)}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
