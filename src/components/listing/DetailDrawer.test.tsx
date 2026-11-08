import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DetailDrawer } from './DetailDrawer';

describe('DetailDrawer', () => {
  it('organiza título, contexto e conteúdo em um detalhe acessível', () => {
    render(
      <DetailDrawer open title="Compra 123" subtitle="Fornecedor Exemplo" onClose={() => undefined}>
        Conteúdo da compra
      </DetailDrawer>,
    );

    expect(screen.getByRole('dialog', { name: 'Compra 123' })).toBeInTheDocument();
    expect(screen.getByText('Fornecedor Exemplo')).toBeInTheDocument();
    expect(screen.getByText('Conteúdo da compra')).toBeInTheDocument();
  });
});
