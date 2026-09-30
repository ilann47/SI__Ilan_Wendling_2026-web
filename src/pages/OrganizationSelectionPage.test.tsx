import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { rememberLastOrganizationId } from '../auth/organizationPreference';
import { OrganizationSelectionPage } from './OrganizationSelectionPage';

vi.mock('../auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../components/SnackbarProvider', () => ({
  useSnackbar: () => ({ notify: vi.fn() }),
}));

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <OrganizationSelectionPage />
    </QueryClientProvider>,
  );
}

describe('OrganizationSelectionPage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('lista organizacoes e exige clique em Entrar mesmo com uma unica', async () => {
    rememberLastOrganizationId(2);
    const selectOrganization = vi.fn();
    vi.mocked(useAuth).mockReturnValue({
      organizations: [
        { organizationId: 1, legalName: 'Kaneko Norte', membershipId: 1, membershipVersion: 0 },
        { organizationId: 2, legalName: 'Kaneko Sul', tradeName: 'Operacao Sul', membershipId: 2, membershipVersion: 0 },
      ],
      selectOrganization,
      logout: vi.fn(),
      activeOrganization: null,
      cancelOrganizationSelection: vi.fn(),
      refreshOrganizations: vi.fn(),
      isContextLoading: false,
    } as unknown as ReturnType<typeof useAuth>);
    vi.spyOn(api, 'get').mockResolvedValue({ data: { id: 1, perfil: 'USUARIO', login: 'maria' } });

    renderPage();
    expect(await screen.findByRole('heading', { name: 'Escolha a organização' })).toBeInTheDocument();
    expect(screen.getByText('Kaneko Norte')).toBeInTheDocument();
    expect(screen.getByText('Operacao Sul')).toBeInTheDocument();
    expect(selectOrganization).not.toHaveBeenCalled();

    await userEvent.type(screen.getByLabelText('Pesquisar organização'), 'norte');
    expect(screen.getByText('Kaneko Norte')).toBeInTheDocument();
    expect(screen.queryByText('Operacao Sul')).not.toBeInTheDocument();
  });

  it('mostra estado vazio e criacao self-service para USUARIO', async () => {
    vi.mocked(useAuth).mockReturnValue({
      organizations: [],
      selectOrganization: vi.fn(),
      logout: vi.fn(),
      user: { login: 'maria', perfil: 'USUARIO' },
      activeOrganization: null,
      cancelOrganizationSelection: vi.fn(),
      refreshOrganizations: vi.fn().mockResolvedValue([]),
      isContextLoading: false,
    } as unknown as ReturnType<typeof useAuth>);
    vi.spyOn(api, 'get').mockResolvedValue({ data: { id: 9, perfil: 'USUARIO', login: 'maria' } });

    renderPage();
    expect(await screen.findByText('Você ainda não possui organizações.')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Criar minha organização' })).toBeInTheDocument();
  });

  it('nao mostra criacao para OPERADOR', async () => {
    vi.mocked(useAuth).mockReturnValue({
      organizations: [],
      selectOrganization: vi.fn(),
      logout: vi.fn(),
      user: { login: 'op', perfil: 'OPERADOR' },
      activeOrganization: null,
      cancelOrganizationSelection: vi.fn(),
      refreshOrganizations: vi.fn(),
      isContextLoading: false,
    } as unknown as ReturnType<typeof useAuth>);

    vi.spyOn(api, 'get').mockResolvedValue({ data: { id: 9, perfil: 'OPERADOR', login: 'op' } });
    renderPage();
    expect(await screen.findByText(/Solicite um convite ao administrador/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Criar/i })).not.toBeInTheDocument();
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/api/v1/me'));
  });

  it('USUARIO cria organizacao sem ativar automaticamente e permite entrar depois', async () => {
    const refreshOrganizations = vi.fn().mockResolvedValue([
      {
        organizationId: 123,
        legalName: 'Kaneko Estacionamentos Ltda',
        tradeName: 'Kaneko',
        membershipId: 456,
        membershipVersion: 0,
      },
    ]);
    const selectOrganization = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useAuth).mockReturnValue({
      organizations: [],
      selectOrganization,
      logout: vi.fn(),
      user: { login: 'maria', perfil: 'USUARIO' },
      activeOrganization: null,
      cancelOrganizationSelection: vi.fn(),
      refreshOrganizations,
      isContextLoading: false,
    } as unknown as ReturnType<typeof useAuth>);

    vi.spyOn(api, 'get').mockImplementation(async (url) => {
      if (url === '/api/v1/me') return { data: { id: 789, perfil: 'USUARIO', login: 'maria' } };
      return { data: [] };
    });
    vi.spyOn(api, 'post').mockResolvedValue({
      data: {
        organization: {
          id: 123,
          document: '12345678000190',
          legalName: 'Kaneko Estacionamentos Ltda',
          tradeName: 'Kaneko',
          currency: 'BRL',
          timeZone: 'America/Sao_Paulo',
          region: 'BR-SP',
          plan: 'ENTERPRISE',
          status: 'ATIVA',
          version: 0,
        },
        membership: {
          id: 456,
          organizationId: 123,
          userId: 789,
          status: 'ATIVO',
          origin: 'DIRETO',
          version: 0,
        },
      },
    });

    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: 'Criar minha organização' }));
    await userEvent.type(screen.getByLabelText('CNPJ / documento empresarial'), '12345678000190');
    await userEvent.type(screen.getByLabelText('Razão social'), 'Kaneko Estacionamentos Ltda');
    await userEvent.type(screen.getByLabelText('Nome fantasia'), 'Kaneko');
    await userEvent.click(screen.getByRole('button', { name: 'Criar organização' }));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/api/v1/me/organizations', expect.objectContaining({
      document: '12345678000190',
      legalName: 'Kaneko Estacionamentos Ltda',
    })));
    expect(await screen.findByText(/criada com sucesso/i)).toBeInTheDocument();
    expect(selectOrganization).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Entrar nesta organização' }));
    await waitFor(() => expect(selectOrganization).toHaveBeenCalledWith(
      123,
      expect.arrayContaining([expect.objectContaining({ organizationId: 123 })]),
    ));
  });

  it('ADMIN executa criacao em duas etapas sem autoativar', async () => {
    const refreshOrganizations = vi.fn().mockResolvedValue([
      { organizationId: 15, legalName: 'Nova Org', membershipId: 30, membershipVersion: 0 },
    ]);
    const selectOrganization = vi.fn();
    vi.mocked(useAuth).mockReturnValue({
      organizations: [
        { organizationId: 1, legalName: 'Existente', membershipId: 1, membershipVersion: 0 },
      ],
      selectOrganization,
      logout: vi.fn(),
      user: { login: 'admin', perfil: 'ADMIN' },
      activeOrganization: { organizationId: 1, legalName: 'Existente', membershipId: 1, membershipVersion: 0 },
      cancelOrganizationSelection: vi.fn(),
      refreshOrganizations,
      isContextLoading: false,
    } as unknown as ReturnType<typeof useAuth>);

    vi.spyOn(api, 'get').mockResolvedValue({ data: { id: 77, perfil: 'ADMIN', login: 'admin' } });
    const post = vi.spyOn(api, 'post')
      .mockResolvedValueOnce({ data: { id: 15, legalName: 'Nova Org', version: 0 } })
      .mockResolvedValueOnce({ data: { id: 30 } });

    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: 'Criar organização' }));
    await userEvent.type(screen.getByLabelText('CNPJ / documento empresarial'), '12345678000195');
    await userEvent.type(screen.getByLabelText('Razão social'), 'Nova Org');
    await userEvent.click(screen.getByRole('button', { name: 'Criar organização' }));

    await waitFor(() => expect(post).toHaveBeenCalledTimes(2));
    expect(post).toHaveBeenNthCalledWith(1, '/api/v1/organizations', expect.objectContaining({
      document: '12345678000195',
      legalName: 'Nova Org',
    }));
    expect(post).toHaveBeenNthCalledWith(2, '/api/v1/organizations/15/memberships', { userId: 77 });
    expect(selectOrganization).not.toHaveBeenCalled();
    expect(await screen.findByRole('button', { name: 'Entrar nesta organização' })).toBeInTheDocument();
  });

  it('associa 409 ao campo documento', async () => {
    vi.mocked(useAuth).mockReturnValue({
      organizations: [],
      selectOrganization: vi.fn(),
      logout: vi.fn(),
      user: { login: 'maria', perfil: 'USUARIO' },
      activeOrganization: null,
      cancelOrganizationSelection: vi.fn(),
      refreshOrganizations: vi.fn(),
      isContextLoading: false,
    } as unknown as ReturnType<typeof useAuth>);
    vi.spyOn(api, 'get').mockResolvedValue({ data: { id: 9, perfil: 'USUARIO', login: 'maria' } });
    vi.spyOn(api, 'post').mockRejectedValue({
      response: { status: 409, data: { title: 'Conflito', detail: 'duplicado' } },
    });

    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: 'Criar minha organização' }));
    await userEvent.type(screen.getByLabelText('CNPJ / documento empresarial'), '12345678000190');
    await userEvent.type(screen.getByLabelText('Razão social'), 'Org');
    await userEvent.click(screen.getByRole('button', { name: 'Criar organização' }));

    expect(await screen.findByText('Já existe uma organização com este documento.')).toBeInTheDocument();
    expect(screen.getByLabelText('Razão social')).toHaveValue('Org');
  });

  it('404 ao ativar atualiza a lista', async () => {
    const refreshOrganizations = vi.fn().mockResolvedValue([]);
    const selectOrganization = vi.fn().mockRejectedValue({
      response: { status: 404, data: { title: 'Nao encontrado' } },
    });
    vi.mocked(useAuth).mockReturnValue({
      organizations: [
        { organizationId: 10, legalName: 'Kaneko', membershipId: 1, membershipVersion: 0 },
      ],
      selectOrganization,
      logout: vi.fn(),
      user: { login: 'admin', perfil: 'ADMIN' },
      activeOrganization: null,
      cancelOrganizationSelection: vi.fn(),
      refreshOrganizations,
      isContextLoading: false,
    } as unknown as ReturnType<typeof useAuth>);
    vi.spyOn(api, 'get').mockResolvedValue({ data: { id: 1, perfil: 'ADMIN', login: 'admin' } });

    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: 'Entrar' }));
    expect(await screen.findByText(/vínculo não está mais disponível/i)).toBeInTheDocument();
    expect(refreshOrganizations).toHaveBeenCalled();
  });
});
