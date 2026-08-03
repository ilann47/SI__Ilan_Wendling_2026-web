import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { useOperationalWorkspace } from '../workspace/OperationalWorkspaceContext';
import { EventAccessPage } from './EventAccessPage';

vi.mock('../auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../workspace/OperationalWorkspaceContext', () => ({ useOperationalWorkspace: vi.fn() }));

afterEach(() => vi.restoreAllMocks());

describe('EventAccessPage', () => {
  it('registra entrada idempotente e apresenta motivo operacional', async () => {
    vi.mocked(useAuth).mockReturnValue({ permissions: ['access:checkin'] } as unknown as ReturnType<typeof useAuth>);
    vi.mocked(useOperationalWorkspace).mockReturnValue({ recent: () => [], remember: vi.fn() } as unknown as ReturnType<typeof useOperationalWorkspace>);
    vi.spyOn(api, 'post').mockResolvedValueOnce({ data: {
      accessAttemptId: 91,
      decision: 'AUTORIZADA',
      reasonCode: 'AUTORIZADA',
      credentialId: 20,
      resultingOccupancy: 31,
      decidedAt: '2026-08-03T04:00:00Z',
    } });

    render(<EventAccessPage />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/QR da credencial/), 'token-seguro');
    await user.type(screen.getByLabelText(/ID do evento/), '5');
    await user.type(screen.getByLabelText(/ID do patio/), '7');
    await user.click(screen.getByRole('button', { name: 'Registrar entrada' }));

    expect(await screen.findAllByText('Acesso autorizado')).toHaveLength(2);
    expect(screen.getByText(/tentativa #91/)).toBeInTheDocument();
    await waitFor(() => expect(api.post).toHaveBeenCalledOnce());
    expect(vi.mocked(api.post).mock.calls[0][2]?.headers).toHaveProperty('Idempotency-Key');
  });
});
