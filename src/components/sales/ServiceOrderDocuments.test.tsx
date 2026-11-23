import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '../../api/client';
import type { ServiceOrder } from '../../api/serviceOrders';
import { ServiceOrderDocuments } from './ServiceOrderDocuments';

vi.mock('../../auth/AuthContext', () => ({ useAuth: () => ({ activeOrganization: { organizationId: 2 }, permissions: [] }) }));
const order = { id: 18, numero: 'OS-18', status: 'CONCLUIDA', valorTotal: 100, itens: [] } as unknown as ServiceOrder;
const note = { id: 21, numero: 'NS-21', situacao: 'PENDENTE', valorTotal: 100 };
const permissions = ['service_orders:read', 'fiscal:read', 'fiscal:manage', 'finance:read'];
function mount(allowed = permissions, status = order.status, movimentacaoPatioId?: number) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<MemoryRouter><QueryClientProvider client={client}><ServiceOrderDocuments organizationId={2}
    order={{ ...order, status, movimentacaoPatioId }} permissions={allowed} /></QueryClientProvider></MemoryRouter>);
  return client;
}
afterEach(() => vi.restoreAllMocks());
describe('faturamento contextual de serviços', () => {
  it('exibe a NFS-e pendente da estadia sem oferecer emissão ou geração manual', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: { nota: null, contas: [],
      nfsePatio: { status: 'PENDENTE_EMISSAO', movimentacaoId: 72, valor: '25.123456' } } });
    mount(permissions, 'CONCLUIDA', 72);
    expect(await screen.findByText('NFS-e pendente de emissão')).toBeVisible();
    expect(screen.queryByRole('button', { name: /Gerar nota|Emitir internamente/ })).not.toBeInTheDocument();
    expect(screen.getByText(/cobrança foi registrada no caixa/)).toBeVisible();
  });
  it('conclusão permite preparar nota, sem afirmar que já existe cobrança', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: { nota: null, contas: [] } }); mount();
    expect(await screen.findByRole('button', { name: 'Gerar nota de serviço' })).toBeInTheDocument();
    expect(screen.getByText(/Nenhuma conta vinculada/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Emitir internamente' })).not.toBeInTheDocument();
  });
  it.each(['RASCUNHO', 'EM_EXECUCAO', 'CANCELADA'] as const)('não permite faturar ordem %s', async (status) => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: { nota: null, contas: [] } }); mount(permissions, status);
    expect(await screen.findByText('Nenhuma nota vinculada.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Gerar nota de serviço' })).not.toBeInTheDocument();
  });
  it('prepara documento com dados adicionais e mesma intenção após timeout', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: { nota: null, contas: [] } });
    const post = vi.spyOn(api, 'post').mockRejectedValueOnce({ isAxiosError: true, code: 'ECONNABORTED' })
      .mockResolvedValueOnce({ data: note }); const client = mount();
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    fireEvent.click(await screen.findByRole('button', { name: 'Gerar nota de serviço' }));
    const form = screen.getByRole('form', { name: 'Gerar nota de serviço' });
    expect(screen.queryByRole('dialog', { name: 'Gerar nota de serviço' })).not.toBeInTheDocument();
    fireEvent.change(within(form).getByRole('textbox', { name: /Número da nota/ }), { target: { value: 'NS-21' } });
    fireEvent.click(within(form).getByRole('button', { name: 'Preparar nota' }));
    fireEvent.click(await within(form).findByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByRole('link', { name: /Conferir nota NS-21/ })).toHaveAttribute('href', '/app/notas-servico/21');
    expect(post.mock.calls[0]).toEqual(post.mock.calls[1]);
    expect(post.mock.calls[0][1]).toEqual({ numero: 'NS-21' });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['tenant', 2, 'list', '/api/notas-servico'] });
  });
  it('mantém as contas da nota emitida acessíveis a partir da ordem', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: { nota: { ...note, situacao: 'EMITIDA' },
      contas: [{ id: 61, numeroParcela: 1, totalParcelas: 1, valorTotal: 100,
        valorOriginal: 100, valorRecebido: 0, dataVencimento: '2026-09-20', situacao: 'PENDENTE' }] } });
    mount();
    expect(await screen.findByRole('link', { name: /Parcela 1\/1/ })).toHaveAttribute('href', '/app/contas-receber?detail=61');
  });
  it('encaminha o rascunho para conferência sem emitir direto pela ordem', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: { nota: note, contas: [] } }); mount();
    expect(await screen.findByRole('link', { name: 'Conferir nota NS-21' }))
      .toHaveAttribute('href', '/app/notas-servico/21');
    expect(screen.queryByRole('button', { name: 'Emitir internamente' })).not.toBeInTheDocument();
  });
  it('não abre a nota vinculada sem permissão de leitura fiscal', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: { nota: note, contas: [] } });
    mount(['service_orders:read', 'fiscal:manage']);
    expect(await screen.findByText('Nota NS-21 preparada. A consulta exige permissão fiscal.')).toBeVisible();
    expect(screen.queryByRole('link', { name: /Conferir nota|Ver nota/ })).not.toBeInTheDocument();
  });
  it('erro de leitura não vira documento inexistente e sem permissão não exibe comandos', async () => {
    vi.spyOn(api, 'get').mockRejectedValue(new Error('Não foi possível consultar o faturamento.')); mount(['service_orders:read']);
    expect(await screen.findByText('Não foi possível consultar o faturamento.')).toBeInTheDocument();
    expect(screen.queryByText('Nenhuma nota vinculada.')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Gerar nota|Emitir internamente/ })).not.toBeInTheDocument();
  });
});
