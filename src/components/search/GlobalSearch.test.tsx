import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { GlobalSearch } from './GlobalSearch';

vi.mock('../../auth/AuthContext', () => ({ useAuth: vi.fn() }));
afterEach(() => vi.restoreAllMocks());

describe('GlobalSearch', () => {
  it('abre com Ctrl+K e apresenta resultados agrupados do backend', async () => {
    const auth = { activeOrganization: { organizationId: 7 } } as unknown as ReturnType<typeof useAuth>;
    vi.mocked(useAuth).mockReturnValue(auth);
    vi.spyOn(api, 'get').mockResolvedValueOnce({ data: { termo: 'mariana', total: 2, grupos: [{
      grupo: 'Clientes', resultados: [{ tipo: 'CLIENTE', id: 1, titulo: 'Mariana Souza',
        subtitulo: '12345678909', status: 'ATIVO', caminho: '/app/clientes' }],
    }, { grupo: 'Veículos', resultados: [{ tipo: 'VEICULO', id: 2, titulo: 'ABC1D23',
      subtitulo: 'SUV · Mariana Souza', status: 'ATIVO', caminho: '/app/veiculos' }],
    }] } });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<MemoryRouter><QueryClientProvider client={client}><GlobalSearch /></QueryClientProvider></MemoryRouter>);

    await userEvent.keyboard('{Control>}k{/Control}');
    await userEvent.type(screen.getByPlaceholderText(/Cliente, CPF/), 'mariana');

    expect(await screen.findByText('Mariana Souza')).toBeInTheDocument();
    expect(screen.getByText('ABC1D23')).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/api/v1/search', { params: { q: 'mariana', limit: 5 } });
  });
});
