import { Box } from '@mui/material';
import { FieldRenderer } from './FieldRenderer';
import { defaultValueFor, type FieldConfig } from './fieldConfig';

export function buildResourceDefaults(fields: FieldConfig[], initial?: Record<string, unknown> | null) {
  return Object.fromEntries(fields.map((field) => [field.name, initial?.[field.name] ?? defaultValueFor(field)]));
}

export function buildResourcePayload(fields: FieldConfig[], values: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const field of fields) {
    if (field.disabled || field.type === 'section' || field.type === 'subitems-summary') continue;
    const value = values[field.name];
    if (value !== '' && value !== undefined) out[field.name] = value;
  }
  return out;
}

/** Mesma ordem e grade de campos para cadastros em página ou em diálogo. */
export function ResourceFormFields({ fields, editing = false }: { fields: FieldConfig[]; editing?: boolean }) {
  return <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(12, minmax(0, 1fr))' }, gap: 2, pt: 1 }}>
    {fields.map((field) => {
      const full = ['subitems', 'subitems-summary', 'textarea', 'section'].includes(field.type);
      const cols = full ? 12 : field.cols ?? 6;
      return <Box key={field.name} sx={{ gridColumn: { sm: `span ${cols}` }, minWidth: 0 }}>
        <FieldRenderer field={editing && field.disabledOnEdit ? { ...field, disabled: true } : field} />
      </Box>;
    })}
  </Box>;
}
