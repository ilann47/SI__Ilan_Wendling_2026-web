import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { OrganizationProvisioningCard } from './OrganizationProvisioningCard';

vi.mock('../../auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../../components/SnackbarProvider', () => ({
  useSnackbar: () => ({ notify: vi.fn() }),
}));

afterEach(() => vi.restoreAllMocks());

describe('OrganizationProvisioningCard', () => {
  it('provisiona organizacao e primeiro vinculo com o usuario autenticado', async () => {
    const refreshOrganizations = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useAuth).mockReturnValue({ refreshOrganizations } as unknown as ReturnType<typeof useAuth>);
    vi.spyOn(api, 'get').mockResolvedValueOnce({ data: { id: 77 } });
    vi.spyOn(api, 'post')
      .mockResolvedValueOnce({ data: { id: 15, legalName: 'Kaneko Eventos', version: 0 } })
      .mockResolvedValueOnce({ data: { id: 30, organizationId: 15, userId: 77 } });

    render(<OrganizationProvisioningCard />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/Documento empresarial/), '12345678000195');
    await user.type(screen.getByLabelText(/Razao social/), 'Kaneko Eventos');
    await user.click(screen.getByRole('button', { name: 'Criar organizacao' }));

    await waitFor(() => expect(refreshOrganizations).toHaveBeenCalledOnce());
    expect(api.post).toHaveBeenNthCalledWith(2, '/api/v1/organizations/15/memberships', { userId: 77 });
  });
});
