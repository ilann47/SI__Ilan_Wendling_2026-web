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

  const renderLayout = () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/app']}>
          <Routes><Route path="/app" element={<AppLayout />} /></Routes>
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

  it('oferece atalhos, rotulos e secoes recolhiveis', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { login: 'operador', perfil: 'OPERADOR' },
      activeOrganization: { organizationId: 10, legalName: 'Kaneko A' },
      organizations: [{ organizationId: 10, legalName: 'Kaneko A' }],
      permissions: [],
      logout: vi.fn(),
      selectOrganization: vi.fn(),
    } as unknown as ReturnType<typeof useAuth>);

    renderLayout();

    expect(screen.getByRole('link', { name: 'Ir para o conteudo principal' })).toHaveAttribute('href', '#conteudo-principal');
    expect(screen.getByRole('button', { name: 'Abrir menu de navegacao' })).toBeInTheDocument();
    expect(screen.getAllByRole('navigation', { name: 'Navegacao principal' }).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Recolher Operação' }));
    await waitFor(() => expect(screen.queryByRole('link', { name: 'Visão geral' })).not.toBeInTheDocument());
  });
});
