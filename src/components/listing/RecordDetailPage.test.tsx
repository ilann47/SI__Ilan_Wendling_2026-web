import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { RecordDetailPage } from './RecordDetailPage';

describe('RecordDetailPage', () => {
  it('organiza título, contexto e conteúdo em um detalhe acessível', () => {
    const back = vi.fn();
    render(<MemoryRouter>
      <RecordDetailPage title="Compra 123" subtitle="Fornecedor Exemplo" onBack={back}>
        Conteúdo da compra
      </RecordDetailPage>
    </MemoryRouter>);

    expect(screen.getByRole('region', { name: 'Compra 123' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Compra 123' })).toHaveFocus();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText('Fornecedor Exemplo')).toBeInTheDocument();
    expect(screen.getByText('Conteúdo da compra')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(back).toHaveBeenCalledOnce();
  });
});
