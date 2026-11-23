import type { FieldConfig } from './fieldConfig';

export function requiresFormPage(fields: readonly FieldConfig[]): boolean {
  return fields.some(({ type }) => type === 'subitems')
    || fields.filter(({ type }) => type !== 'section' && type !== 'subitems-summary').length >= 7;
}
