import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api/client';
import { SnackbarProvider } from '../components/SnackbarProvider';
import { StockPage } from './StockPage';

const state = vi.hoisted(() => ({ permissions: ['stock:read', 'fiscal:read'] }));
vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({
  activeOrganization: { organizationId: 2 }, permissions: state.permissions,
}) }));

const movement = { id: 15, produto: 'Água mineral', localEstoque: 'Loja', tipo: 'RECEBIMENTO',
  delta: 5, saldoAnterior: 2, saldoPosterior: 7, motivo: 'Mercadoria conferida', atorNome: 'Ana Operadora',
  ocorridoEm: '2026-09-12T12:00:00Z', origemTipo: 'NOTA_ENTRADA', origemChave: '99:1:segredo-tecnico' };

function setup(selectedMovement = movement) {
  vi.spyOn(api, 'get').mockImplementation(async (url) => ({ data: String(url).endsWith('/origin')
    ? { tipo: 'NOTA_ENTRADA', id: 5, descricao: 'Nota de entrada NF-99', caminho: '/app/notas-entrada/5' }
    : String(url).endsWith('/15') ? selectedMovement
      : { content: [], totalElements: 0 } }));
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
  beforeEach(() => { state.permissions = ['stock:read', 'fiscal:read']; });
  afterEach(() => vi.restoreAllMocks());
  it('não arredonda um milionésimo na movimentação nem nos saldos', async () => {
    setup({ ...movement, delta: 0.000001, saldoAnterior: 1.000002, saldoPosterior: 1.000003 });
    const dialog = await screen.findByRole('dialog', { name: 'Detalhe do movimento' });
    expect(await within(dialog).findByText(/Quantidade movimentada:/)).toHaveTextContent('0,000001');
    expect(within(dialog).getByText(/Saldo anterior:/)).toHaveTextContent('1,000002');
    expect(within(dialog).getByText(/Saldo posterior:/)).toHaveTextContent('1,000003');
  });
  it('abre movimento exato da URL com ator, motivo, cadeia de saldo e documento de origem', async () => {
    setup();
    const dialog = await screen.findByRole('dialog', { name: 'Detalhe do movimento' });
    expect(await within(dialog).findByText(/Ana Operadora/)).toBeInTheDocument();
    expect(within(dialog).getByText(/Mercadoria conferida/)).toBeInTheDocument();
    expect(within(dialog).getByText(/Saldo anterior/)).toBeInTheDocument();
    expect(await within(dialog).findByRole('link', { name: /Nota de entrada NF-99/ }))
      .toHaveAttribute('href', '/app/notas-entrada/5');
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

  it('não permite compensação isolada de movimento originado por nota fiscal', async () => {
    state.permissions = ['stock:read', 'stock:manage', 'fiscal:read'];
    setup();
    const dialog = await screen.findByRole('dialog', { name: 'Detalhe do movimento' });
    expect(await within(dialog).findByText(/são revertidos pelo documento de origem/)).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: 'Compensar movimento' })).not.toBeInTheDocument();
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

  it('um link antigo de ajuste abre somente a consulta, mesmo para gestor', async () => {
    state.permissions = ['stock:read', 'stock:manage', 'catalog:read'];
    setupStockView('/app/estoque?tab=ajustes', { content: [], totalElements: 0 });
    expect(await screen.findByText('Posição consolidada')).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Ajustar estoque' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ajustar estoque' })).not.toBeInTheDocument();
  });

  it('mantém ajustes históricos visíveis, mas sem ação de compensar', async () => {
    state.permissions = ['stock:read', 'stock:manage', 'catalog:read'];
    setup({ ...movement, tipo: 'AJUSTE', origemTipo: 'AJUSTE_MANUAL' });
    const dialog = await screen.findByRole('dialog', { name: 'Detalhe do movimento' });
    expect(await within(dialog).findByText('Tipo: Ajuste')).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: 'Compensar movimento' })).not.toBeInTheDocument();
  });
});
