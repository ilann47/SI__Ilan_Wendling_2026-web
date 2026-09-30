import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { FinancialAccountsPage } from './FinancialAccountsPage';

vi.mock('../auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../components/SnackbarProvider', () => ({ useSnackbar: () => ({ notify: vi.fn() }) }));
afterEach(() => vi.restoreAllMocks());
const title = { id: 42, clienteNome: 'Cliente exato', situacao: 'PARCIAL', numeroParcela: 1,
  totalParcelas: 2, valorOriginal: 100, valorTotal: 100, valorRecebido: 40, saldo: 60,
  dataVencimento: '2030-10-15', origem: { tipo: 'VENDA', id: 7, numero: '7', url: '/app/vendas-administrativas?detail=7' } };

function setup(permissions = ['finance:read', 'sales:read'], url = '/app/contas-receber?detail=42&situacao=PARCIAL') {
  vi.mocked(useAuth).mockReturnValue({ activeOrganization: { organizationId: 7 }, permissions } as ReturnType<typeof useAuth>);
  vi.spyOn(api, 'get').mockImplementation(async (path) => ({ data: String(path).endsWith('/resumo')
    ? { quantidade: 30, valorOriginal: 3000, valorTotal: 3000, valorBaixado: 1000, saldo: 2000 }
    : String(path).endsWith('/baixas') ? [{ id: 1, valor: 40, data: '2030-09-01', atorNome: 'Operador', saldoAnterior: false }]
      : String(path).endsWith('/42') ? title : { content: [title], totalElements: 30, totalPages: 3 } }));
  render(<MemoryRouter initialEntries={[url]}><QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <FinancialAccountsPage tipo="receber" />
  </QueryClientProvider></MemoryRouter>);
}

describe('Financeiro operacional', () => {
  it('usa os mesmos filtros da URL na página e nos totais completos', async () => {
    setup();
    expect(await screen.findByText('R$ 2.000,00')).toBeInTheDocument();
    expect((await screen.findAllByText('Parcial')).length).toBeGreaterThan(0);
    expect(screen.queryByText('PARCIAL')).not.toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/api/contas-receber/resumo', { params: { situacao: 'PARCIAL' } });
    expect(api.get).toHaveBeenCalledWith('/api/contas-receber', { params: { situacao: 'PARCIAL', page: 0, size: 10, sort: 'dataVencimento,asc' } });
    const drawer = await screen.findByRole('dialog');
    expect(await within(drawer).findByText('Operador')).toBeInTheDocument();
    expect(within(drawer).getByRole('link', { name: /Pedido de venda/ })).toHaveAttribute('href', '/app/vendas-administrativas?detail=7');
    expect(within(drawer).queryByRole('button', { name: 'Registrar recebimento' })).not.toBeInTheDocument();
  });

  it('preserva chave e conteúdo para repetir baixa após falha de conexão', async () => {
    setup(['finance:read', 'finance:manage']);
    const post = vi.spyOn(api, 'post').mockRejectedValueOnce(new Error('Falha de conexão')).mockResolvedValueOnce({ data: { ...title, saldo: 0 } });
    const user = userEvent.setup();
    const drawer = await screen.findByRole('dialog');
    await user.click(await within(drawer).findByRole('button', { name: 'Registrar recebimento' }));
    expect(await screen.findByText(/não executa uma transferência bancária/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Confirmar registro' }));
    expect(await screen.findByText(/Falha de conexão/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Confirmar registro' }));
    await waitFor(() => expect(post).toHaveBeenCalledTimes(2));
    expect(post.mock.calls[0]).toEqual(post.mock.calls[1]);
    expect(post.mock.calls[0][2]).toMatchObject({ headers: { 'Idempotency-Key': expect.any(String) } });
  });
});
