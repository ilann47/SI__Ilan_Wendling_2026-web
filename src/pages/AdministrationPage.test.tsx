import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
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
vi.mock('../components/form/ReferenceSelect', () => ({
  ReferenceSelect: ({ label }: { label: string }) => <label>{label}<input /></label>,
}));

afterEach(() => vi.restoreAllMocks());

function renderAdministration(path = '/app/administracao') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[path]}>
    <Routes>
      <Route path="/app/administracao" element={<AdministrationPage />} />
      <Route path="/app/administracao/vinculos/:membershipId" element={<AdministrationPage />} />
    </Routes>
  </MemoryRouter></QueryClientProvider>);
}

describe('AdministrationPage', () => {
  it('abre a inclusao de usuario no dialogo padrao sem expor operacoes administrativas indevidas', async () => {
    vi.mocked(useOperationalWorkspace).mockReturnValue({ recent: () => [], remember: vi.fn() } as unknown as ReturnType<typeof useOperationalWorkspace>);
    vi.mocked(useAuth).mockReturnValue({
      activeOrganization: { organizationId: 9, legalName: 'Kaneko' },
      permissions: ['users:invite'],
      user: { login: 'admin', perfil: 'ADMIN' },
    } as unknown as ReturnType<typeof useAuth>);

    renderAdministration();

    expect(screen.getByText(/Selecione o usuário pelo cadastro global/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Criar vínculo' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar usuário' }));
    expect(screen.getByRole('dialog', { name: 'Adicionar usuário' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Criar vínculo' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Consultar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Alterar estado' })).not.toBeInTheDocument();
  });

  it('não monta o seletor global de usuários para uma conta apenas contextual', () => {
    vi.mocked(useAuth).mockReturnValue({
      activeOrganization: { organizationId: 9, legalName: 'Kaneko' },
      permissions: ['users:invite'],
      user: { login: 'gestor', perfil: 'USUARIO' },
    } as unknown as ReturnType<typeof useAuth>);
    renderAdministration();
    expect(screen.queryByRole('button', { name: 'Adicionar usuário' })).not.toBeInTheDocument();
  });

  it('separa concessao e revogacao de papeis', () => {
    vi.mocked(useOperationalWorkspace).mockReturnValue({ recent: () => [], remember: vi.fn() } as unknown as ReturnType<typeof useOperationalWorkspace>);
    vi.mocked(useAuth).mockReturnValue({
      activeOrganization: { organizationId: 9, legalName: 'Kaneko' },
      permissions: ['roles:grant'],
    } as unknown as ReturnType<typeof useAuth>);

    renderAdministration();

    expect(screen.getByRole('button', { name: 'Conceder papel' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Revogar atribuição' })).not.toBeInTheDocument();
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
    renderAdministration();
    const user = userEvent.setup();
    const legalName = await screen.findByLabelText(/Razão social/);
    await user.clear(legalName);
    await user.type(legalName, 'Kaneko Eventos');
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    await waitFor(() => expect(api.patch).toHaveBeenCalledOnce());
    expect(vi.mocked(api.patch).mock.calls[0][2]).toEqual({ headers: { 'If-Match': '"4"' } });
  });

  it('consulta um vínculo em uma subpágina e retorna à aba de usuários', async () => {
    vi.mocked(useOperationalWorkspace).mockReturnValue({ recent: () => [], remember: vi.fn() } as unknown as ReturnType<typeof useOperationalWorkspace>);
    vi.mocked(useAuth).mockReturnValue({ activeOrganization: { organizationId: 9 }, permissions: ['organizations:admin'] } as unknown as ReturnType<typeof useAuth>);
    const get = vi.spyOn(api, 'get').mockResolvedValue({ data: {
      id: 12, organizationId: 9, userId: 2, status: 'ATIVO', origin: 'CONVITE', version: 3, joinedAt: '2026-11-22T00:00:00Z',
    } });
    renderAdministration('/app/administracao?tab=vinculos');
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/Código de referência — Vínculo/), '12');
    await user.click(screen.getByRole('button', { name: 'Abrir vínculo' }));
    expect(screen.getByRole('heading', { name: 'Vínculo #12' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Alterar estado' })).toBeInTheDocument();
    expect(get).toHaveBeenCalledExactlyOnceWith('/api/v1/organizations/9/memberships/12');
    await user.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(screen.getByRole('tab', { name: 'Usuários e vínculos', selected: true })).toBeInTheDocument();
  });

  it('não lê o vínculo quando o perfil pode convidar mas não administrar organização', () => {
    vi.mocked(useAuth).mockReturnValue({ activeOrganization: { organizationId: 9 }, permissions: ['users:invite'], user: { perfil: 'ADMIN' } } as unknown as ReturnType<typeof useAuth>);
    const get = vi.spyOn(api, 'get');
    renderAdministration('/app/administracao/vinculos/12');
    expect(screen.getByRole('heading', { name: 'Vínculo indisponível' })).toBeInTheDocument();
    expect(get).not.toHaveBeenCalled();
  });
});
