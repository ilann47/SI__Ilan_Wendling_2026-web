import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api/client';
import { useOperationalWorkspace } from '../workspace/OperationalWorkspaceContext';
import { useAuth } from '../auth/AuthContext';
import { SalesPage } from './SalesPage';

vi.mock('../workspace/OperationalWorkspaceContext', () => ({
  useOperationalWorkspace: vi.fn(),
}));
vi.mock('../auth/AuthContext', () => ({ useAuth: vi.fn() }));

afterEach(() => vi.restoreAllMocks());

describe('SalesPage', () => {
  it('exibe somente a area autorizada pelo tenant', () => {
    vi.mocked(useAuth).mockReturnValue({ permissions: ['credentials:issue'] } as unknown as ReturnType<typeof useAuth>);
    vi.mocked(useOperationalWorkspace).mockReturnValue({
      recent: () => [], remember: vi.fn(),
    } as unknown as ReturnType<typeof useOperationalWorkspace>);

    render(<SalesPage />);

    expect(screen.getByRole('tab', { name: 'Credenciais' })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Holds' })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Pedidos' })).not.toBeInTheDocument();
  });

  it('nao oferece criar ou consultar pedido sem as permissoes correspondentes', () => {
    vi.mocked(useAuth).mockReturnValue({
      activeOrganization: { organizationId: 2 }, permissions: ['orders:manual-confirm'],
    } as unknown as ReturnType<typeof useAuth>);
    vi.mocked(useOperationalWorkspace).mockReturnValue({
      recent: () => [], remember: vi.fn(),
    } as unknown as ReturnType<typeof useOperationalWorkspace>);

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><SalesPage /></QueryClientProvider>);

    expect(screen.getByText('Confirmacao manual')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Criar pedido' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Consultar' })).not.toBeInTheDocument();
  });

  it('cria hold idempotente a partir de produto real', async () => {
    const remember = vi.fn();
    vi.mocked(useAuth).mockReturnValue({ permissions: ['inventory:hold'] } as unknown as ReturnType<typeof useAuth>);
    vi.mocked(useOperationalWorkspace).mockReturnValue({
      recent: () => [], remember,
    } as unknown as ReturnType<typeof useOperationalWorkspace>);
    vi.spyOn(api, 'post').mockResolvedValueOnce({ data: {
      id: 40, eventId: 5, parkingProductId: 7, quantity: 1, channel: 'WEB',
      priceTierId: 9, unitPrice: 50, currency: 'BRL', status: 'MANTIDA',
      expiresAt: '2026-08-03T04:00:00Z', version: 0,
    } });

    render(<SalesPage />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/ID do produto/), '7');
    await user.click(screen.getByRole('button', { name: 'Criar hold' }));

    await waitFor(() => expect(api.post).toHaveBeenCalledOnce());
    expect(vi.mocked(api.post).mock.calls[0][1]).toMatchObject({ parkingProductId: 7, quantity: 1, channel: 'WEB' });
    expect(vi.mocked(api.post).mock.calls[0][2]?.headers).toHaveProperty('Idempotency-Key');
    expect(remember).toHaveBeenCalledWith('hold', expect.objectContaining({ id: 40, version: 0 }));
  });
});
