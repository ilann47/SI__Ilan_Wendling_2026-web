import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '../auth/AuthContext';
import { AppLayout } from './AppLayout';

vi.mock('../auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../context/ColorModeContext', () => ({
  useColorMode: () => ({ mode: 'light', toggle: vi.fn() }),
}));

describe('AppLayout', () => {
  beforeEach(() => vi.mocked(useAuth).mockReset());

  const renderLayout = (path = '/app') => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/app" element={<AppLayout />}>
              <Route index element={<div>Hub</div>} />
              <Route path="patio" element={<div>Patio</div>} />
              <Route path="movimentacoes" element={<div>Movimentacoes</div>} />
              <Route path="areas/operacao" element={<div>Área de operação</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
  };

  it('permite trocar para outra organizacao acessivel', async () => {
    const selectOrganization = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useAuth).mockReturnValue({
      user: { login: 'admin', perfil: 'ADMIN' },
      activeOrganization: { organizationId: 10, legalName: 'Kaneko A' },
      organizations: [
        { organizationId: 10, legalName: 'Kaneko A' },
        { organizationId: 11, legalName: 'Kaneko B' },
      ],
      permissions: [],
      logout: vi.fn(),
      selectOrganization,
    } as unknown as ReturnType<typeof useAuth>);

    renderLayout();

    fireEvent.click(screen.getByRole('button', { name: 'Conta' }));
    fireEvent.click(screen.getByRole('menuitem', { name: /Kaneko B/ }));

    await waitFor(() => expect(selectOrganization).toHaveBeenCalledWith(11));
  });

  it('na home do hub nao exibe sidebar de modulo', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { login: 'operador', perfil: 'OPERADOR' },
      activeOrganization: { organizationId: 10, legalName: 'Kaneko A' },
      organizations: [{ organizationId: 10, legalName: 'Kaneko A' }],
      permissions: [],
      logout: vi.fn(),
      selectOrganization: vi.fn(),
    } as unknown as ReturnType<typeof useAuth>);

    renderLayout('/app');

    expect(screen.getByRole('link', { name: 'Ir para o conteúdo principal' })).toHaveAttribute('href', '#conteudo-principal');
    expect(screen.getAllByRole('button', { name: 'Kaneko' }).length).toBeGreaterThan(0);
    expect(screen.getByRole('navigation', { name: 'Áreas da plataforma' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Navegação principal' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Abrir menu de navegação' })).not.toBeInTheDocument();
  });

  it.each(['Conta', 'Contexto operacional'])('mantém o menu %s acima do cabeçalho', async (name) => {
    vi.mocked(useAuth).mockReturnValue({
      user: { login: 'admin', perfil: 'ADMIN' },
      activeOrganization: { organizationId: 10, legalName: 'Kaneko A' },
      organizations: [{ organizationId: 10, legalName: 'Kaneko A' }],
      permissions: ['stock:read'],
      logout: vi.fn(),
      selectOrganization: vi.fn(),
    } as unknown as ReturnType<typeof useAuth>);
    renderLayout();
    const header = screen.getByRole('banner');
    const trigger = screen.getAllByRole('button', { name })[0];
    fireEvent.click(trigger);
    const menu = screen.getByRole('menu');
    const overlay = menu.closest('.MuiModal-root');
    expect(overlay).not.toBeNull();
    expect(Number(getComputedStyle(overlay!).zIndex)).toBeGreaterThan(Number(getComputedStyle(header).zIndex));
    expect(screen.getByRole('menuitem', { name: 'Escolher ou criar organização' })).toBeInTheDocument();
    fireEvent.keyDown(menu, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
  });

  it('na página da área evita duplicar os processos na sidebar', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { login: 'operador', perfil: 'OPERADOR' },
      activeOrganization: { organizationId: 10, legalName: 'Kaneko A' },
      organizations: [{ organizationId: 10, legalName: 'Kaneko A' }],
      permissions: ['operations:read'],
      logout: vi.fn(),
      selectOrganization: vi.fn(),
    } as unknown as ReturnType<typeof useAuth>);

    renderLayout('/app/areas/operacao');
    expect(screen.getByRole('navigation', { name: 'Áreas da plataforma' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Navegação principal' })).not.toBeInTheDocument();
    expect(screen.getByText('Área de operação')).toBeInTheDocument();
  });

  it('dentro de um módulo mantém somente o menu superior, sem sidebar ou abas', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { login: 'operador', perfil: 'OPERADOR' },
      activeOrganization: { organizationId: 10, legalName: 'Kaneko A' },
      organizations: [{ organizationId: 10, legalName: 'Kaneko A' }],
      permissions: ['operations:read'],
      logout: vi.fn(),
      selectOrganization: vi.fn(),
    } as unknown as ReturnType<typeof useAuth>);

    renderLayout('/app/movimentacoes');

    expect(screen.getByRole('navigation', { name: 'Áreas da plataforma' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Navegação principal' })).not.toBeInTheDocument();
    expect(screen.getByText('Movimentacoes')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Movimentações' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Recolher Operação' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ordens de Compra' })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Abrir menu de navegação' })).not.toBeInTheDocument();
  });
});
