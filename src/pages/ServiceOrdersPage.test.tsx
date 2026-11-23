import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { ServiceOrdersPage } from './ServiceOrdersPage';

vi.mock('../auth/AuthContext', () => ({ useAuth: vi.fn() }));
afterEach(() => vi.restoreAllMocks());

describe('próxima ação de serviço no detalhe', () => {
  it('não oferece criar OS quando falta acesso aos seletores obrigatórios', async () => {
    vi.mocked(useAuth).mockReturnValue({ activeOrganization: { organizationId: 2 },
      permissions: ['service_orders:read', 'service_orders:manage'] } as unknown as ReturnType<typeof useAuth>);
    const get = vi.spyOn(api, 'get').mockResolvedValue({ data: { content: [], totalElements: 0 } });
    render(<MemoryRouter initialEntries={['/app/ordens-servico']}>
      <QueryClientProvider client={new QueryClient()}><ServiceOrdersPage /></QueryClientProvider>
    </MemoryRouter>);
    await waitFor(() => expect(get).toHaveBeenCalled());
    expect(screen.queryByRole('button', { name: 'Nova ordem' })).not.toBeInTheDocument();
    expect(get.mock.calls.map(([url]) => url)).not.toContain('/api/clientes');
  });
  it('volta ao número, situação e página registrados na URL da lista', async () => {
    vi.mocked(useAuth).mockReturnValue({ activeOrganization: { organizationId: 2 }, permissions: ['service_orders:read'] } as unknown as ReturnType<typeof useAuth>);
    const order = { id: 15, numero: 'OS-15', clienteNome: 'Cliente da ordem', status: 'RASCUNHO', valorTotal: 90, itens: [], version: 2 };
    vi.spyOn(api, 'get').mockImplementation(async (url) => ({ data: String(url).endsWith('/15') ? order
      : String(url).endsWith('/documents') ? { nota: null, contas: null }
        : { content: [order], totalElements: 21, totalPages: 3 } }));
    render(<MemoryRouter initialEntries={['/app/ordens-servico?detail=15&numero=OS&status=RASCUNHO&page=1']}>
      <QueryClientProvider client={new QueryClient()}><ServiceOrdersPage /></QueryClientProvider>
    </MemoryRouter>);
    const detail = await screen.findByRole('region', { name: 'Ordem OS-15' });
    fireEvent.click(within(detail).getByRole('button', { name: 'Voltar' }));
    expect(await screen.findByText('11–20 de 21')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Buscar por número')).toHaveValue('OS');
    expect(api.get).toHaveBeenCalledWith('/api/v1/service-orders', {
      params: expect.objectContaining({ numero: 'OS', status: 'RASCUNHO', page: 1 }),
    });
  });
  it.each([['RASCUNHO', true, 'Iniciar serviço'], ['EM_EXECUCAO', true, 'Concluir serviço'], ['CONCLUIDA', true, null], ['RASCUNHO', false, null]])(
    '%s com gerenciamento=%s', async (status, manage, action) => {
      vi.mocked(useAuth).mockReturnValue({ activeOrganization: { organizationId: 2 }, permissions: ['service_orders:read', ...(manage ? ['service_orders:manage'] : [])] } as unknown as ReturnType<typeof useAuth>);
      vi.spyOn(api, 'get').mockImplementation(async (url) => ({ data: String(url).endsWith('/15')
        ? { id: 15, numero: 'OS-15', clienteNome: 'Cliente da ordem', status, valorTotal: 90, itens: [], version: 2 }
        : { content: [], totalElements: 0 } }));
      render(<MemoryRouter initialEntries={['/app/ordens-servico?detail=15']}><QueryClientProvider client={new QueryClient()}><ServiceOrdersPage /></QueryClientProvider></MemoryRouter>);
      const drawer = await screen.findByRole('region', { name: 'Ordem OS-15' });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(await within(drawer).findByRole('heading', { name: 'Ordem OS-15' })).toBeInTheDocument();
      if (action) expect(within(drawer).getByRole('button', { name: action })).toBeInTheDocument();
      else expect(within(drawer).queryByRole('button', { name: /Iniciar serviço|Concluir serviço/ })).not.toBeInTheDocument();
    });
  it('conclui o serviço sem cobrança e mantém a ordem aberta para preparar a nota', async () => {
    vi.mocked(useAuth).mockReturnValue({ activeOrganization: { organizationId: 2 }, permissions: ['service_orders:read', 'service_orders:manage', 'fiscal:manage'] } as unknown as ReturnType<typeof useAuth>);
    const order = { id: 15, numero: 'OS-15', clienteNome: 'Cliente da ordem', status: 'EM_EXECUCAO', valorTotal: 90, itens: [], version: 2 };
    vi.spyOn(api, 'get').mockImplementation(async (url) => ({ data: String(url).endsWith('/documents') ? { nota: null, contas: null }
      : String(url).endsWith('/15') ? order : { content: [], totalElements: 0 } }));
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: { ...order, status: 'CONCLUIDA', version: 3 } });
    render(<MemoryRouter initialEntries={['/app/ordens-servico?detail=15']}><QueryClientProvider client={new QueryClient()}><ServiceOrdersPage /></QueryClientProvider></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: 'Concluir serviço' }));
    const confirmation = screen.getByRole('alertdialog', { name: 'Concluir ordem' });
    expect(within(confirmation).getByText(/Não gera contas a receber/)).toBeInTheDocument();
    fireEvent.click(within(confirmation).getByRole('button', { name: 'Concluir' }));
    await waitFor(() => expect(post).toHaveBeenCalledWith('/api/v1/service-orders/15/completion', null, { headers: { 'If-Match': '"2"' } }));
    expect(await screen.findByRole('heading', { name: 'Ordem OS-15' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Gerar nota de serviço' })).toBeInTheDocument();
  });
});
