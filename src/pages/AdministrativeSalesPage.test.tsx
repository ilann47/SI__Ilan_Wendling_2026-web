import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { AdministrativeSalesPage } from './AdministrativeSalesPage';

vi.mock('../auth/AuthContext', () => ({ useAuth: vi.fn() }));

const sale = { id: 15, numero: 'PV-15', clienteId: 8, clienteNome: 'Cliente do pedido',
  localEstoqueId: 2, localEstoqueNome: 'Loja', status: 'CONFIRMADA',
  dataEmissao: '2026-09-12', moeda: 'BRL', subtotal: 100, valorDesconto: 10,
  valorTotal: 90, version: 2, itens: [{ id: 5, produtoId: 9, produtoNome: 'Água',
    quantidade: 10, valorUnitario: 10, valorDesconto: 0, valorTotal: 100 }] };
const permissions = ['sales:read', 'sales:manage', 'fiscal:read', 'fiscal:manage', 'finance:read', 'stock:read'];
const note = { id: 29, numero: 'N-29', situacao: 'PENDENTE', valorTotal: 90 };
const documents = { nota: note, contas: [{ id: 71, numeroParcela: 1, totalParcelas: 1,
  dataVencimento: '2026-09-20', valorOriginal: 90, valorTotal: 90, valorRecebido: 20, situacao: 'PARCIAL' }],
movimentos: [{ id: 30, produto: 'Água', localEstoque: 'Loja', tipo: 'SAIDA', delta: -10,
  saldoAnterior: 25, saldoPosterior: 15, ocorridoEm: '2026-09-12T12:00:00Z', atorId: 1 }] };

function auth(allowed = permissions, organizationId = 2) {
  vi.mocked(useAuth).mockReturnValue({ activeOrganization: { organizationId }, permissions: allowed } as unknown as ReturnType<typeof useAuth>);
}
function mount(path = '/app/vendas-administrativas?detail=15') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const result = render(<MemoryRouter initialEntries={[path]}><QueryClientProvider client={client}><AdministrativeSalesPage /></QueryClientProvider></MemoryRouter>);
  return { client, ...result };
}
function reads(overrides: { docs?: unknown; status?: string } = {}) {
  return vi.spyOn(api, 'get').mockImplementation(async (url) => ({ data: String(url).endsWith('/documents')
    ? (overrides.docs ?? documents) : String(url).endsWith('/15')
      ? { ...sale, status: overrides.status ?? sale.status } : { content: [], totalElements: 0 } }));
}
beforeEach(() => auth());
afterEach(() => vi.restoreAllMocks());

describe('Pedidos de venda no contexto operacional', () => {
  it('abre o registro exato fora da página, mostra itens, nota, parcelas e movimentos', async () => {
    reads(); const { client } = mount();
    const drawer = await screen.findByRole('dialog');
    expect(await within(drawer).findByRole('heading', { name: 'Pedido PV-15' })).toBeInTheDocument();
    expect(await within(drawer).findByRole('link', { name: /Ver nota N-29/ })).toHaveAttribute('href', '/app/notas-saida?detail=29');
    expect(within(drawer).getByRole('link', { name: /Parcela 1\/1/ })).toHaveAttribute('href', '/app/contas-receber?detail=71');
    expect(within(drawer).getByText('Saldo a receber')).toBeInTheDocument();
    expect(within(drawer).getByText(/70,00/)).toBeInTheDocument();
    expect(within(drawer).getByRole('heading', { name: 'Movimentações de estoque' })).toBeInTheDocument();
    expect(client.getQueryCache().getAll().filter((query) => query.queryKey.includes('documents'))[0].queryKey.slice(0, 2)).toEqual(['tenant', 2]);
  });
  it('não apresenta uma falha de documentos como nota inexistente', async () => {
    const get = reads(); get.mockImplementation(async (url) => {
      if (String(url).endsWith('/documents')) throw new Error('Falha de consulta');
      return { data: String(url).endsWith('/15') ? sale : { content: [], totalElements: 0 } };
    });
    mount();
    expect(await screen.findByText('Falha de consulta')).toBeInTheDocument();
    expect(screen.queryByText('Nenhuma nota vinculada.')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Gerar nota de saída' })).not.toBeInTheDocument();
  });
  it('não revela seções sem permissão nem permite geração em rascunho', async () => {
    auth(['sales:read']); reads({ docs: { nota: null, contas: null, movimentos: null }, status: 'RASCUNHO' });
    mount();
    const drawer = await screen.findByRole('dialog');
    expect(await within(drawer).findByText('Itens do pedido')).toBeInTheDocument();
    expect(within(drawer).queryByRole('link', { name: /Ver nota|Parcela/ })).not.toBeInTheDocument();
    expect(within(drawer).queryByText('Saldo a receber')).not.toBeInTheDocument();
    expect(within(drawer).queryByRole('button', { name: /Gerar nota|Confirmar pedido/ })).not.toBeInTheDocument();
  });
  it('explica confirmação e atualiza detalhe sem perder o contexto', async () => {
    reads({ status: 'RASCUNHO', docs: { nota: null, contas: [], movimentos: [] } });
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: sale }); const { client } = mount();
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    fireEvent.click(await screen.findByRole('button', { name: 'Confirmar pedido' }));
    expect(await screen.findByText(/baixa o estoque.*gera as contas a receber/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar venda' }));
    await waitFor(() => expect(post).toHaveBeenCalledWith('/api/v1/administrative-sales/15/confirmation', null, { headers: { 'If-Match': '"2"' } }));
    expect(await screen.findByRole('heading', { name: 'Pedido PV-15' })).toBeInTheDocument();
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['tenant', 2, 'financial-accounts'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['tenant', 2, 'financial-summary'] });
  });
  it('gera a nota somente com informações adicionais e reaproveita a chave após timeout', async () => {
    reads({ docs: { ...documents, nota: null } });
    const post = vi.spyOn(api, 'post').mockRejectedValueOnce({ isAxiosError: true, code: 'ECONNABORTED', message: 'timeout' })
      .mockResolvedValueOnce({ data: note }); const { client } = mount();
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    fireEvent.click(await screen.findByRole('button', { name: 'Gerar nota de saída' }));
    const form = await screen.findByRole('dialog', { name: 'Gerar nota de saída' });
    fireEvent.change(within(form).getByRole('textbox', { name: /Número da nota/ }), { target: { value: 'N-29' } });
    fireEvent.click(within(form).getByRole('button', { name: 'Preparar nota' }));
    expect(await within(form).findByText(/Não recebemos a confirmação/)).toBeInTheDocument();
    expect(within(form).getByRole('textbox', { name: /Número da nota/ })).toHaveValue('N-29');
    fireEvent.click(within(form).getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByRole('link', { name: /Ver nota N-29/ })).toBeInTheDocument();
    expect(post).toHaveBeenCalledTimes(2);
    expect(post.mock.calls[0][0]).toBe('/api/v1/administrative-sales/15/outbound-note');
    expect(post.mock.calls[0][1]).toEqual({ numero: 'N-29' });
    expect(post.mock.calls[1]).toEqual(post.mock.calls[0]);
    expect(post.mock.calls[0][2]?.headers).toHaveProperty('Idempotency-Key');
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['tenant', 2, 'list', '/api/notas-saida'] });
  });
  it('consulta nota existente após conflito sem repetir automaticamente o POST', async () => {
    let created = false;
    vi.spyOn(api, 'get').mockImplementation(async (url) => ({ data: String(url).endsWith('/documents')
      ? { ...documents, nota: created ? note : null } : String(url).endsWith('/15') ? sale : { content: [], totalElements: 0 } }));
    const post = vi.spyOn(api, 'post').mockImplementation(async () => { created = true; throw { response: { status: 409 } }; });
    mount(); fireEvent.click(await screen.findByRole('button', { name: 'Gerar nota de saída' }));
    const form = await screen.findByRole('dialog', { name: 'Gerar nota de saída' });
    fireEvent.change(within(form).getByRole('textbox', { name: /Número da nota/ }), { target: { value: 'N-29' } });
    fireEvent.click(within(form).getByRole('button', { name: 'Preparar nota' }));
    expect(await screen.findByRole('link', { name: /Ver nota N-29/ })).toBeInTheDocument();
    expect(post).toHaveBeenCalledTimes(1);
  });
  it('retém erro de conflito quando a consulta não encontra nota vinculada', async () => {
    reads({ docs: { ...documents, nota: null } });
    vi.spyOn(api, 'post').mockRejectedValue({ response: { status: 409, data: { detail: 'Número já utilizado.' } } }); mount();
    fireEvent.click(await screen.findByRole('button', { name: 'Gerar nota de saída' }));
    const form = await screen.findByRole('dialog', { name: 'Gerar nota de saída' });
    fireEvent.change(within(form).getByRole('textbox', { name: /Número da nota/ }), { target: { value: 'N-29' } });
    fireEvent.click(within(form).getByRole('button', { name: 'Preparar nota' }));
    expect(await within(form).findByText('Número já utilizado.')).toBeInTheDocument();
    expect(within(form).getByRole('textbox', { name: /Número da nota/ })).toHaveValue('N-29');
  });
  it('não reaproveita dados de outra organização após trocar o contexto', async () => {
    const get = reads(); const view = mount();
    expect(await screen.findByRole('heading', { name: 'Pedido PV-15' })).toBeInTheDocument();
    auth(permissions, 3); get.mockImplementation(async (url) => {
      if (String(url).endsWith('/15')) throw { response: { status: 404 } };
      return { data: { content: [], totalElements: 0 } };
    });
    view.rerender(<MemoryRouter initialEntries={['/app/vendas-administrativas?detail=15']}><QueryClientProvider client={view.client}><AdministrativeSalesPage /></QueryClientProvider></MemoryRouter>);
    expect(await screen.findByText('O recurso solicitado não foi encontrado.')).toBeInTheDocument();
    expect(screen.queryByText('Cliente do pedido')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Ver nota N-29/ })).not.toBeInTheDocument();
  });
  it('sem fiscal:manage permite consultar nota mas não gerar', async () => {
    auth(['sales:read', 'fiscal:read']); reads({ docs: { ...documents, nota: null } }); mount();
    expect(await screen.findByText('Nenhuma nota vinculada.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Gerar nota de saída' })).not.toBeInTheDocument();
  });
});
