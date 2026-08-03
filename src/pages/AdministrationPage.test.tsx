import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { useOperationalWorkspace } from '../workspace/OperationalWorkspaceContext';
import { AdministrationPage } from './AdministrationPage';

vi.mock('../auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../workspace/OperationalWorkspaceContext', () => ({ useOperationalWorkspace: vi.fn() }));
vi.mock('../components/SnackbarProvider', () => ({
  useSnackbar: () => ({ notify: vi.fn() }),
}));

afterEach(() => vi.restoreAllMocks());

describe('AdministrationPage', () => {
  it('nao oferece consulta ou alteracao para quem pode apenas convidar', () => {
    vi.mocked(useOperationalWorkspace).mockReturnValue({ recent: () => [], remember: vi.fn() } as unknown as ReturnType<typeof useOperationalWorkspace>);
    vi.mocked(useAuth).mockReturnValue({
      activeOrganization: { organizationId: 9, legalName: 'Kaneko' },
      permissions: ['users:invite'],
    } as unknown as ReturnType<typeof useAuth>);

    render(<AdministrationPage />);

    expect(screen.getByRole('button', { name: 'Criar vinculo' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Consultar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Alterar estado' })).not.toBeInTheDocument();
  });

  it('separa concessao e revogacao de papeis', () => {
    vi.mocked(useOperationalWorkspace).mockReturnValue({ recent: () => [], remember: vi.fn() } as unknown as ReturnType<typeof useOperationalWorkspace>);
    vi.mocked(useAuth).mockReturnValue({
      activeOrganization: { organizationId: 9, legalName: 'Kaneko' },
      permissions: ['roles:grant'],
    } as unknown as ReturnType<typeof useAuth>);

    render(<AdministrationPage />);

    expect(screen.getByRole('button', { name: 'Conceder papel' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Revogar atribuicao' })).not.toBeInTheDocument();
  });

  it('atualiza a organizacao usando a versao carregada', async () => {
    vi.mocked(useAuth).mockReturnValue({
      activeOrganization: { organizationId: 9, legalName: 'Kaneko' },
      permissions: ['organizations:admin'],
    } as unknown as ReturnType<typeof useAuth>);
    vi.spyOn(api, 'get').mockResolvedValueOnce({ data: {
      id: 9,
      document: '12345678000195',
      legalName: 'Kaneko',
      tradeName: null,
      currency: 'BRL',
      timeZone: 'America/Sao_Paulo',
      region: 'BR-SP',
      plan: 'ENTERPRISE',
      status: 'ATIVA',
      version: 4,
    } });
    vi.spyOn(api, 'patch').mockResolvedValueOnce({ data: {
      id: 9, document: '12345678000195', legalName: 'Kaneko Eventos',
      currency: 'BRL', timeZone: 'America/Sao_Paulo', region: 'BR-SP',
      plan: 'ENTERPRISE', status: 'ATIVA', version: 5,
    } });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(<QueryClientProvider client={queryClient}><AdministrationPage /></QueryClientProvider>);
    const user = userEvent.setup();
    const legalName = await screen.findByLabelText(/Razao social/);
    await user.clear(legalName);
    await user.type(legalName, 'Kaneko Eventos');
    await user.click(screen.getByRole('button', { name: 'Salvar alteracoes' }));

    await waitFor(() => expect(api.patch).toHaveBeenCalledOnce());
    expect(vi.mocked(api.patch).mock.calls[0][2]).toEqual({ headers: { 'If-Match': '"4"' } });
  });
});
