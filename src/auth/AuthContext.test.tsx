import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext';

function SessionProbe() {
  const { logout } = useAuth();
  return <button onClick={logout}>Sair</button>;
}

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
});
