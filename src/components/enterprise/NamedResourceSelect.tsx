import { Autocomplete, TextField } from '@mui/material';

export interface NamedOption { id: number; label: string }

interface Props {
  label: string;
  value: string;
  onChange: (id: string) => void;
  options?: readonly NamedOption[];
  recent?: readonly NamedOption[];
  helperText?: string;
  emptyText?: string;
  disabled?: boolean;
  required?: boolean;
  selected?: NamedOption;
  onSearch?: (value: string) => void;
  loading?: boolean;
  error?: boolean;
}

/** Usa registros reais, sem aceitar texto livre como referência. */
export function NamedResourceSelect({ label, value, onChange, options = [], recent = [],
  helperText, emptyText = 'Nenhum registro encontrado.', disabled, required, selected, onSearch, loading, error }: Props) {
  const choices = [...new Map([...recent, ...options].map((option) => [option.id, option])).values()];
  return <Autocomplete fullWidth size="small" sx={{ minWidth: 0 }}
    options={choices} getOptionKey={(option) => option.id}
    value={selected ?? choices.find((option) => String(option.id) === value) ?? null}
    isOptionEqualToValue={(option, selected) => option.id === selected.id}
    onChange={(_, option) => onChange(option ? String(option.id) : '')}
    onInputChange={onSearch ? (_, term, reason) => onSearch(reason === 'input' ? term : '') : undefined}
    filterOptions={onSearch ? (items) => items : undefined}
    loading={loading} loadingText="Buscando registros…"
    disabled={disabled} noOptionsText={emptyText}
    openText="Mostrar opções" closeText="Recolher opções" clearText="Limpar seleção"
    renderInput={(params) => <TextField {...params} label={label} required={required} error={error}
      placeholder="Buscar pelo nome" helperText={helperText} />}
  />;
}

export const namedOptions = (items: readonly { id: number; name: string }[]) =>
  items.map(({ id, name }) => ({ id, label: name }));
