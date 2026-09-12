import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { ServiceOrdersPage } from './ServiceOrdersPage';

vi.mock('../auth/AuthContext', () => ({ useAuth: vi.fn() }));
afterEach(() => vi.restoreAllMocks());

describe('próxima ação de serviço no detalhe', () => {
  it.each([['RASCUNHO', true, 'Iniciar serviço'], ['EM_EXECUCAO', true, 'Concluir serviço'], ['CONCLUIDA', true, null], ['RASCUNHO', false, null]])(
    '%s com gerenciamento=%s', async (status, manage, action) => {
      vi.mocked(useAuth).mockReturnValue({ activeOrganization: { organizationId: 2 }, permissions: ['service_orders:read', ...(manage ? ['service_orders:manage'] : [])] } as unknown as ReturnType<typeof useAuth>);
      vi.spyOn(api, 'get').mockImplementation(async (url) => ({ data: String(url).endsWith('/15')
        ? { id: 15, numero: 'OS-15', clienteNome: 'Cliente da ordem', status, valorTotal: 90, itens: [], version: 2 }
        : { content: [], totalElements: 0 } }));
      render(<MemoryRouter initialEntries={['/app/ordens-servico?detail=15']}><QueryClientProvider client={new QueryClient()}><ServiceOrdersPage /></QueryClientProvider></MemoryRouter>);
      const drawer = await screen.findByRole('dialog');
      expect(await within(drawer).findByRole('heading', { name: 'Ordem OS-15' })).toBeInTheDocument();
      if (action) expect(within(drawer).getByRole('button', { name: action })).toBeInTheDocument();
      else expect(within(drawer).queryByRole('button', { name: /Iniciar serviço|Concluir serviço/ })).not.toBeInTheDocument();
    });
});
