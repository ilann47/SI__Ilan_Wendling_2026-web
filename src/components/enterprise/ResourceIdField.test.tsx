import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ResourceIdField } from './ResourceIdField';

const recent = [
  { id: 12, label: 'Evento Convenção', version: 3, updatedAt: '2026-10-24T10:00:00Z' },
];

describe('ResourceIdField', () => {
  it('prioriza a referência pelo nome sem expor o ID na opção principal', () => {
    const onChange = vi.fn();
    render(<ResourceIdField label="Evento" value="" onChange={onChange} recent={recent} />);

    fireEvent.mouseDown(screen.getByRole('combobox', { name: /Evento/ }));

    expect(screen.getByRole('option', { name: 'Evento Convenção' })).toBeInTheDocument();
    expect(screen.queryByText('#12')).not.toBeInTheDocument();
  });

  it('mantém uma alternativa explícita quando o contrato não oferece catálogo', () => {
    render(<ResourceIdField label="Evento" value="" onChange={vi.fn()} recent={[]} />);

    expect(screen.getByLabelText(/Código de referência — Evento/)).toBeInTheDocument();
    expect(screen.getByText(/ainda não há opções recentes para evento/i)).toBeInTheDocument();
  });
});
