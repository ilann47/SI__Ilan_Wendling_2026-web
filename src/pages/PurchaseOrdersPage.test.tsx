import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { PurchaseOrdersPage } from './PurchaseOrdersPage';

vi.mock('../auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../components/SnackbarProvider', () => ({
  useSnackbar: () => ({ notify: vi.fn() }),
}));

afterEach(() => vi.restoreAllMocks());

describe('PurchaseOrdersPage', () => {
  it('mostra os itens e o resumo financeiro nos detalhes da ordem', async () => {
    vi.mocked(useAuth).mockReturnValue({
      activeOrganization: { organizationId: 7 },
      permissions: ['purchases:read'],
    } as unknown as ReturnType<typeof useAuth>);
    vi.spyOn(api, 'get').mockResolvedValueOnce({ data: {
      content: [{
        id: 12,
        numero: 'OC-2026-001',
        fornecedorId: 3,
        fornecedorNome: 'Fornecedor Kaneko',
        status: 'PARCIALMENTE_RECEBIDA',
        dataEmissao: '2026-08-14',
        previsaoEntrega: '2026-08-20',
        moeda: 'BRL',
        subtotal: 100,
        valorFrete: 15,
        valorDesconto: 5,
        valorTotal: 110,
        observacao: 'Entregar no deposito central',
        version: 2,
        itens: [{
          id: 21,
          sequencia: 1,
          produtoId: 9,
          produtoNome: 'Oleo 5W30',
          quantidadePedida: 10,
          quantidadeRecebida: 4,
          quantidadePendente: 6,
          valorUnitario: 10,
          valorDesconto: 0,
          valorTotal: 100,
        }],
      }],
      totalElements: 1,
      totalPages: 1,
    } });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(<QueryClientProvider client={client}><PurchaseOrdersPage /></QueryClientProvider>);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Detalhes' }));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'Detalhes da ordem OC-2026-001' })).toBeInTheDocument();
    expect(within(dialog).getByText('Oleo 5W30')).toBeInTheDocument();
    expect(within(dialog).getByRole('cell', { name: '10' })).toBeInTheDocument();
    expect(within(dialog).getByRole('cell', { name: '4' })).toBeInTheDocument();
    expect(within(dialog).getByRole('cell', { name: '6' })).toBeInTheDocument();
    expect(within(dialog).getByText('Entregar no deposito central')).toBeInTheDocument();
    expect(within(dialog).getByText('R$ 110,00')).toBeInTheDocument();
  });
});
