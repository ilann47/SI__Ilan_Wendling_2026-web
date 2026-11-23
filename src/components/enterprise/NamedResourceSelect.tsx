import { ReferenceSelect } from '../form/ReferenceSelect';
import type { ReferenceSource } from '../form/ReferencePickerDialog';

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
  onCreate?: ReferenceSource['onCreate'];
}

/** Opções já autorizadas e carregadas pela tela (sem buscar outro escopo). */
export function NamedResourceSelect({ label, value, onChange, options = [], recent = [],
  helperText, emptyText, disabled, required, selected, onCreate }: Props) {
  const choices = [...new Map([...recent, ...options].map((option) => [option.id, { ...option }])).values()];
  return <ReferenceSelect label={label} value={value ? Number(value) : null}
    onChange={(id) => onChange(id ? String(id) : '')} selectedOption={selected ? { ...selected } : undefined}
    reference={{ basePath: 'local:' + label, labelField: 'label' }}
    source={{ options: choices, onCreate }} helperText={helperText} emptyText={emptyText} disabled={disabled}
    required={required} stackedLabel />;
}

export const namedOptions = (items: readonly { id: number; name: string }[]) =>
  items.map(({ id, name }) => ({ id, label: name }));
