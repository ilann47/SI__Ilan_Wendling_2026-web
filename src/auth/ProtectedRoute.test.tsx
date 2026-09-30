import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProtectedRoute } from './ProtectedRoute';
import { useAuth } from './AuthContext';

vi.mock('./AuthContext', () => ({ useAuth: vi.fn() }));

function LoginProbe() {
  const location = useLocation();
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
  return <span>Login a partir de {from}</span>;
}

describe('ProtectedRoute', () => {
  beforeEach(() => vi.mocked(useAuth).mockReset());

  it('preserva a origem ao redirecionar sessão anônima', () => {
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: false } as ReturnType<typeof useAuth>);
    render(
      <MemoryRouter initialEntries={['/app/eventos']}>
        <Routes>
          <Route path="/login" element={<LoginProbe />} />
          <Route path="/app/eventos" element={<ProtectedRoute><span>Eventos</span></ProtectedRoute>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText('Login a partir de /app/eventos')).toBeInTheDocument();
  });

  it('renderiza o conteúdo para sessão autenticada', () => {
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: true } as ReturnType<typeof useAuth>);
    render(<MemoryRouter><ProtectedRoute><span>Conteúdo protegido</span></ProtectedRoute></MemoryRouter>);
    expect(screen.getByText('Conteúdo protegido')).toBeInTheDocument();
  });
});
