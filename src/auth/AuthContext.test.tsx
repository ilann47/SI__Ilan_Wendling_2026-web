import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, getToken } from '../api/client';
import { AuthProvider, useAuth } from './AuthContext';

function SessionProbe() {
  const { activeOrganization, login, logout, permissions, selectOrganization } = useAuth();
  return <>
    <span>Tenant: {activeOrganization?.organizationId ?? 'nenhum'}</span>
    <span>Permissoes: {permissions.join(',') || 'nenhuma'}</span>
    <button onClick={() => void login('admin', 'senha')}>Entrar</button>
    <button onClick={() => void selectOrganization(10).catch(() => undefined)}>Selecionar</button>
    <button onClick={logout}>Sair</button>
  </>;
}

afterEach(() => vi.restoreAllMocks());

describe('AuthProvider', () => {
  it('remove dados remotos do tenant ao encerrar a sessão', () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(['tenant', 10, 'events'], [{ id: 1 }]);
    localStorage.setItem('kaneko.token', 'token-invalido');

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider><SessionProbe /></AuthProvider>
      </QueryClientProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Sair' }));

    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
    expect(localStorage.getItem('kaneko.token')).toBeNull();
  });

  it('nao assume o novo tenant quando a carga de permissoes falha', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    vi.spyOn(api, 'post')
      .mockResolvedValueOnce({ data: {
        token: 'token-global', tipo: 'Bearer', login: 'admin', perfil: 'ADMIN',
      } })
      .mockResolvedValueOnce({ data: {
        token: 'token-contextual',
        activeOrganization: { organizationId: 10, membershipId: 20, membershipVersion: 0 },
      } });
    vi.spyOn(api, 'get')
      .mockResolvedValueOnce({ data: [
        {
          organizationId: 10,
          legalName: 'Kaneko Eventos',
          membershipId: 20,
          membershipVersion: 0,
        },
        {
          organizationId: 11,
          legalName: 'Kaneko Operacoes',
          membershipId: 21,
          membershipVersion: 0,
        },
      ] })
      .mockRejectedValueOnce(new Error('Falha ao carregar permissoes'));

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider><SessionProbe /></AuthProvider>
      </QueryClientProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    await waitFor(() => expect(getToken()).toBe('token-global'));

    fireEvent.click(screen.getByRole('button', { name: 'Selecionar' }));

    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
    expect(getToken()).toBe('token-global');
    expect(screen.getByText('Tenant: nenhum')).toBeInTheDocument();
    expect(screen.getByText('Permissoes: nenhuma')).toBeInTheDocument();
  });
});
