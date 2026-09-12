import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '../auth/AuthContext';
import { NoOrganizationAccessPage } from './NoOrganizationAccessPage';

vi.mock('../auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../context/ColorModeContext', () => ({
  useColorMode: () => ({ mode: 'light', toggle: vi.fn() }),
}));
vi.mock('../features/organizations/OrganizationProvisioningCard', () => ({
  OrganizationProvisioningCard: () => <div>Provisionamento admin</div>,
}));

describe('NoOrganizationAccessPage', () => {
  beforeEach(() => vi.mocked(useAuth).mockReset());

  it('mostra estado vazio para conta sem organizacao e permite atualizar e sair', async () => {
    const logout = vi.fn();
    const refreshOrganizations = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useAuth).mockReturnValue({
      user: { login: 'maria.silva', perfil: 'USUARIO' },
      logout,
      refreshOrganizations,
    } as unknown as ReturnType<typeof useAuth>);

    render(<NoOrganizationAccessPage />);

    expect(screen.getByRole('heading', { name: 'Bem-vindo ao Kaneko' })).toBeInTheDocument();
    expect(screen.getByText(/ainda não possui acesso a uma organização/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Criar organização' })).toBeDisabled();
    expect(screen.getByText('Criação de organização estará disponível em breve.')).toBeInTheDocument();
    expect(screen.queryByText('Provisionamento admin')).not.toBeInTheDocument();
    expect(screen.queryByText('Operação')).not.toBeInTheDocument();
    expect(screen.queryByText('Administração')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Atualizar organizações' }));
    await waitFor(() => expect(refreshOrganizations).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('button', { name: 'Sair' }));
    expect(logout).toHaveBeenCalled();
  });
});
