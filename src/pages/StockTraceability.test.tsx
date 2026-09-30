import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api/client';
import { SnackbarProvider } from '../components/SnackbarProvider';
import { StockPage } from './StockPage';

const state = vi.hoisted(() => ({ permissions: ['stock:read', 'purchases:read'] }));
vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({
  activeOrganization: { organizationId: 2 }, permissions: state.permissions,
}) }));

const movement = { id: 15, produto: 'Água mineral', localEstoque: 'Loja', tipo: 'RECEBIMENTO',
  delta: 5, saldoAnterior: 2, saldoPosterior: 7, motivo: 'Mercadoria conferida', atorNome: 'Ana Operadora',
  ocorridoEm: '2026-09-12T12:00:00Z', origemTipo: 'ORDEM_COMPRA', origemChave: '99:1:segredo-tecnico' };

function setup() {
  vi.spyOn(api, 'get').mockImplementation(async (url) => ({ data: String(url).endsWith('/origin')
    ? { tipo: 'RECEBIMENTO_COMPRA', id: 5, descricao: 'Recebimento da ordem OC-99', caminho: '/app/ordens-compra?detail=99&recebimentoId=5' }
    : String(url).endsWith('/15') ? movement : { content: [], totalElements: 0 } }));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<MemoryRouter initialEntries={['/app/estoque?tab=razao&produtoId=3&detail=15']}>
    <QueryClientProvider client={client}><SnackbarProvider><StockPage /></SnackbarProvider></QueryClientProvider>
  </MemoryRouter>);
  return userEvent.setup();
}

function setupStockView(path: string, response: Record<string, unknown>) {
  vi.spyOn(api, 'get').mockResolvedValue({ data: response });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<MemoryRouter initialEntries={[path]}>
    <QueryClientProvider client={client}><SnackbarProvider><StockPage /></SnackbarProvider></QueryClientProvider>
  </MemoryRouter>);
  return userEvent.setup();
}

describe('rastreabilidade de estoque', () => {
  beforeEach(() => { state.permissions = ['stock:read', 'purchases:read']; });
  afterEach(() => vi.restoreAllMocks());
  it('abre movimento exato da URL com ator, motivo, cadeia de saldo e documento de origem', async () => {
    setup();
    const dialog = await screen.findByRole('dialog', { name: 'Detalhe do movimento' });
    expect(await within(dialog).findByText(/Ana Operadora/)).toBeInTheDocument();
    expect(within(dialog).getByText(/Mercadoria conferida/)).toBeInTheDocument();
    expect(within(dialog).getByText(/Saldo anterior/)).toBeInTheDocument();
    expect(await within(dialog).findByRole('link', { name: /Recebimento da ordem OC-99/ }))
      .toHaveAttribute('href', '/app/ordens-compra?detail=99&recebimentoId=5');
    expect(screen.queryByText(/segredo-tecnico/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText('ID do produto')).not.toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/api/v1/stock-movements', { params: expect.objectContaining({ produtoId: 3, page: 0, size: 20 }) });
  });
  it('não mostra o documento de outro módulo sem permissão, mesmo com resposta residual', async () => {
    state.permissions = ['stock:read'];
    setup();
    const dialog = await screen.findByRole('dialog', { name: 'Detalhe do movimento' });
    expect(await within(dialog).findByText('Seu acesso não permite consultar o documento de origem.')).toBeInTheDocument();
    expect(within(dialog).queryByRole('link', { name: /Recebimento/ })).not.toBeInTheDocument();
    expect(within(dialog).queryByText(/OC-99/)).not.toBeInTheDocument();
  });

  it('oferece ações de local em card no mobile sem expor botões lado a lado', async () => {
    state.permissions = ['stock:read', 'stock:manage'];
    const user = setupStockView('/app/estoque?tab=locais', {
      content: [{ id: 9, nome: 'Depósito central', ativo: true }],
      totalElements: 1,
      totalPages: 1,
    });

    const actions = await screen.findByRole('button', { name: 'Ações' });
    await user.click(actions);

    expect(screen.getByRole('menuitem', { name: 'Editar' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Inativar' })).toBeInTheDocument();
  });
});
