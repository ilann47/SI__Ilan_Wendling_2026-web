import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PermissionRoute } from './PermissionRoute';
import { useAuth } from './AuthContext';

vi.mock('./AuthContext', () => ({ useAuth: vi.fn() }));

describe('PermissionRoute', () => {
  beforeEach(() => vi.mocked(useAuth).mockReset());

  it('renderiza a rota quando ao menos uma permissao exigida esta presente', () => {
    vi.mocked(useAuth).mockReturnValue({ permissions: ['access:checkin'] } as ReturnType<typeof useAuth>);
    render(
      <MemoryRouter>
        <PermissionRoute anyOf={['access:validate', 'access:checkin']}>
          <span>Console operacional</span>
        </PermissionRoute>
      </MemoryRouter>,
    );
    expect(screen.getByText('Console operacional')).toBeInTheDocument();
  });

  it('nega acesso direto quando a permissao nao esta presente', () => {
    vi.mocked(useAuth).mockReturnValue({ permissions: [] } as unknown as ReturnType<typeof useAuth>);
    render(
      <MemoryRouter>
        <PermissionRoute anyOf={['audit:read']}><span>Auditoria</span></PermissionRoute>
      </MemoryRouter>,
    );
    expect(screen.queryByText('Auditoria')).not.toBeInTheDocument();
    expect(screen.getByText('Acesso nao autorizado')).toBeInTheDocument();
  });
});
