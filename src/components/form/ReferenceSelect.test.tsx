import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { ReferenceSelect } from './ReferenceSelect';

vi.mock('../../auth/AuthContext', () => ({ useAuth: vi.fn() }));
afterEach(() => vi.restoreAllMocks());
const reference = { basePath: '/api/v1/stock-locations', labelField: 'nome' };
function auth(organizationId?: number) {
  vi.mocked(useAuth).mockReturnValue({ activeOrganization: organizationId ? { organizationId } : null, permissions: [] } as unknown as ReturnType<typeof useAuth>);
}
describe('seletores de referência seguros e honestos', () => {
  it('erro na busca não aparece como lista vazia', async () => {
    auth(2); vi.spyOn(api, 'get').mockRejectedValue(new Error('Falha ao consultar locais.'));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><ReferenceSelect label="Local" value={null} reference={reference} onChange={vi.fn()} /></QueryClientProvider>);
    fireEvent.click(screen.getByRole('textbox', { name: 'Local' }));
    expect(await screen.findByText('Falha ao consultar locais.')).toBeInTheDocument();
    expect(screen.queryByText('Nenhum registro encontrado.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument();
  });
  it('isola referência desconhecida pelo registry entre organizações', async () => {
    auth(2); const get = vi.spyOn(api, 'get').mockResolvedValue({ data: { id: 1, nome: 'Loja organização A' } });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const page = <QueryClientProvider client={client}><ReferenceSelect label="Local" value={1} reference={reference} onChange={vi.fn()} /></QueryClientProvider>;
    const view = render(page);
    expect(await screen.findByDisplayValue('Loja organização A')).toBeInTheDocument();
    auth(3); get.mockResolvedValue({ data: { id: 1, nome: 'Loja organização B' } });
    view.rerender(<QueryClientProvider client={client}><ReferenceSelect label="Local" value={1} reference={reference} onChange={vi.fn()} /></QueryClientProvider>);
    expect(await screen.findByDisplayValue('Loja organização B')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('Loja organização A')).not.toBeInTheDocument();
    expect(client.getQueryCache().getAll().filter((query) => query.queryKey.includes('reference-one')).map((query) => query.queryKey.slice(0, 2)))
      .toEqual([['tenant', 2], ['tenant', 3]]);
  });
  it('não consulta referência sem contexto organizacional nem mostra IDs crus', async () => {
    auth(); const get = vi.spyOn(api, 'get');
    render(<QueryClientProvider client={new QueryClient()}><ReferenceSelect label="Local" value={1} reference={reference} onChange={vi.fn()} /></QueryClientProvider>);
    expect(screen.getByRole('textbox', { name: 'Local' })).toBeDisabled();
    expect(screen.queryByDisplayValue('#1')).not.toBeInTheDocument();
    expect(get).not.toHaveBeenCalled();
  });
  it('erro ao resolver cadastro selecionado fica visível', async () => {
    auth(2); vi.spyOn(api, 'get').mockRejectedValue(new Error('Cadastro indisponível.'));
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><ReferenceSelect label="Local" value={1} reference={reference} onChange={vi.fn()} /></QueryClientProvider>);
    expect(await screen.findByText('Cadastro indisponível.')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('#1')).not.toBeInTheDocument();
  });
});
