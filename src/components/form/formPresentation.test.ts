import { describe, expect, it } from 'vitest';
import type { FieldConfig } from './fieldConfig';
import { requiresFormPage } from './formPresentation';

const fields = (count: number): FieldConfig[] => Array.from({ length: count }, (_, index) => ({
  name: String(index), label: String(index), type: 'text',
}));

describe('form presentation', () => {
  it('keeps short actions in dialogs and moves extensive forms to a page', () => {
    expect(requiresFormPage(fields(2))).toBe(false);
    expect(requiresFormPage(fields(7))).toBe(true);
  });

  it('uses a page for repeatable items and ignores purely visual sections', () => {
    expect(requiresFormPage([...fields(2), { name: 'itens', label: 'Itens', type: 'subitems' }])).toBe(true);
    expect(requiresFormPage([...fields(6), { name: 'secao', label: 'Seção', type: 'section' }])).toBe(false);
  });
});
