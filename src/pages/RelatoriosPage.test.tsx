import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api/client';
import { RelatoriosPage, tituloOrigemLabel } from './RelatoriosPage';

vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({ activeOrganization: { organizationId: 2 }, permissions: ['stock:read'] }) }));
afterEach(() => vi.restoreAllMocks());
const setup = () => render(<MemoryRouter initialEntries={['/app/relatorios?tab=estoque']}><QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><RelatoriosPage /></QueryClientProvider></MemoryRouter>);

describe('pendência de estoque', () => {
  it('abre diretamente a relação completa de produtos no mínimo', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: { total: 1, itens: [{ produtoId: 5, produto: 'Água', quantidade: 2, quantidadeMinima: 5 }] } });
    setup();
    expect(await screen.findByText('Água')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Estoque mínimo' })).toHaveAttribute('aria-selected', 'true');
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.get).toHaveBeenCalledWith('/api/relatorios/estoque-minimo');
  });
  it('não mostra estoque saudável quando o relatório falha', async () => {
    vi.spyOn(api, 'get').mockRejectedValue(new Error('Falha na consulta'));
    setup();
    expect(await screen.findByRole('button', { name: /Tentar novamente/ })).toBeInTheDocument();
    expect(screen.queryByText('Estoque saudável.')).not.toBeInTheDocument();
  });
});

describe('textos dos relatórios', () => {
  it.each([
    ['DESPESA_AVULSA', 'Despesa avulsa'],
    ['CONTA_PAGAR', 'Conta a pagar'],
    ['CONTA_RECEBER', 'Conta a receber'],
  ])('traduz a origem %s', (origem, label) => {
    expect(tituloOrigemLabel(origem)).toBe(label);
  });
});
