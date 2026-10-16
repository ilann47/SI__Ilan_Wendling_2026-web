import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api/client';
import { CrudResourcePage } from '../components/crud/CrudResourcePage';
import { contaReceberConfig } from '../resources/financeiro';

vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({ activeOrganization: { organizationId: 2 }, permissions: ['finance:read'] }) }));
afterEach(() => vi.restoreAllMocks());

describe('conta aberta pela pendência', () => {
  it('busca o detalhe por ID mesmo quando a conta não está na primeira página', async () => {
    vi.spyOn(api, 'get').mockImplementation(async (url) => ({ data: String(url).endsWith('/99')
      ? { id: 99, clienteNome: 'Cliente vinculado', situacao: 'PARCIAL', valorTotal: 500, valorRecebido: 200 }
      : { content: [], totalElements: 0 } }));
    render(<MemoryRouter initialEntries={['/app/contas-receber?detail=99']}><QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <CrudResourcePage config={contaReceberConfig} />
    </QueryClientProvider></MemoryRouter>);
    const drawer = await screen.findByRole('dialog');
    expect(await within(drawer).findByText('Cliente vinculado')).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/api/contas-receber/99');
    expect(within(drawer).queryByRole('button', { name: /Baixar/ })).not.toBeInTheDocument();
  });
});
