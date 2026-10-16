import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { CreateOrganizationPanel } from './CreateOrganizationPanel';

vi.mock('../../auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../../components/SnackbarProvider', () => ({
  useSnackbar: () => ({ notify: vi.fn() }),
}));

afterEach(() => vi.restoreAllMocks());

function renderPanel(onCreated = vi.fn()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <CreateOrganizationPanel onCreated={onCreated} />
    </QueryClientProvider>,
  );
  return onCreated;
}

describe('CreateOrganizationPanel', () => {
  it('USUARIO usa POST /api/v1/me/organizations e nao ativa sozinho', async () => {
    const refreshOrganizations = vi.fn().mockResolvedValue([]);
    vi.mocked(useAuth).mockReturnValue({ refreshOrganizations } as unknown as ReturnType<typeof useAuth>);
    vi.spyOn(api, 'get').mockResolvedValue({ data: { id: 789, perfil: 'USUARIO', login: 'maria' } });
    vi.spyOn(api, 'post').mockResolvedValue({
      data: {
        organization: { id: 123, legalName: 'Kaneko', tradeName: null },
        membership: { id: 456, organizationId: 123, userId: 789, status: 'ATIVO', origin: 'DIRETO', version: 0 },
      },
    });
    const onCreated = renderPanel();
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText('CNPJ / documento empresarial'), '12345678000190');
    await user.type(screen.getByLabelText('Razão social'), 'Kaneko');
    await user.click(screen.getByRole('button', { name: 'Criar organização' }));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/api/v1/me/organizations', expect.objectContaining({
      document: '12345678000190',
    })));
    expect(onCreated).toHaveBeenCalledWith(expect.objectContaining({ organizationId: 123, membershipId: 456 }));
    expect(refreshOrganizations).toHaveBeenCalled();
  });

  it('ADMIN cria organizacao e membership em duas etapas', async () => {
    const refreshOrganizations = vi.fn().mockResolvedValue([]);
    vi.mocked(useAuth).mockReturnValue({ refreshOrganizations } as unknown as ReturnType<typeof useAuth>);
    vi.spyOn(api, 'get').mockResolvedValue({ data: { id: 77, perfil: 'ADMIN', login: 'admin' } });
    vi.spyOn(api, 'post')
      .mockResolvedValueOnce({ data: { id: 15, legalName: 'Nova' } })
      .mockResolvedValueOnce({ data: { id: 30 } });
    const onCreated = renderPanel();
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText('CNPJ / documento empresarial'), '12345678000195');
    await user.type(screen.getByLabelText('Razão social'), 'Nova');
    await user.click(screen.getByRole('button', { name: 'Criar organização' }));

    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(2));
    expect(api.post).toHaveBeenNthCalledWith(2, '/api/v1/organizations/15/memberships', { userId: 77 });
    expect(onCreated).toHaveBeenCalledWith(expect.objectContaining({ organizationId: 15 }));
  });
});
