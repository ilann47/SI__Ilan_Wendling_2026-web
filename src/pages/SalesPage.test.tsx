import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api/client';
import { useOperationalWorkspace } from '../workspace/OperationalWorkspaceContext';
import { SalesPage } from './SalesPage';

vi.mock('../workspace/OperationalWorkspaceContext', () => ({
  useOperationalWorkspace: vi.fn(),
}));

afterEach(() => vi.restoreAllMocks());

describe('SalesPage', () => {
  it('cria hold idempotente a partir de produto real', async () => {
    const remember = vi.fn();
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
