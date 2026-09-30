import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { ColorModeProvider } from '../../context/ColorModeContext';
import {
  inboundNoteFromReceiptPath,
  PurchaseProcessStrip,
} from './PurchaseProcessStrip';

describe('PurchaseProcessStrip', () => {
  it('apresenta o caminho operacional completo de compras', () => {
    render(
      <ColorModeProvider>
        <MemoryRouter>
          <PurchaseProcessStrip active="recebimento" />
        </MemoryRouter>
      </ColorModeProvider>,
    );

    expect(screen.getByRole('navigation', { name: 'Fluxo de compras' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /1\. Ordem/ })).toHaveAttribute('href', '/app/ordens-compra');
    expect(screen.getByRole('link', { name: /2\. Receber/ })).toHaveAttribute('href', '/app/recebimentos');
    expect(screen.getByRole('link', { name: /3\. Nota/ })).toHaveAttribute('href', '/app/notas-entrada');
    expect(screen.getByRole('link', { name: /4\. Pagar/ })).toHaveAttribute('href', '/app/contas-pagar');
  });

  it('monta o CTA de nota a partir do recebimento selecionado', () => {
    expect(inboundNoteFromReceiptPath(12, 34))
      .toBe('/app/notas-entrada/nova?ordemId=12&recebimentoId=34');
  });
});
