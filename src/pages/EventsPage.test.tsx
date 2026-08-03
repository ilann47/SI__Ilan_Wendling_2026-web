import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api/client';
import { useOperationalWorkspace } from '../workspace/OperationalWorkspaceContext';
import { EventsPage } from './EventsPage';

vi.mock('../workspace/OperationalWorkspaceContext', () => ({
  useOperationalWorkspace: vi.fn(),
}));

afterEach(() => vi.restoreAllMocks());

describe('EventsPage', () => {
  it('cria evento com contrato temporal e chave idempotente', async () => {
    const remember = vi.fn();
    vi.mocked(useOperationalWorkspace).mockReturnValue({
      recent: () => [], remember,
    } as unknown as ReturnType<typeof useOperationalWorkspace>);
    vi.spyOn(api, 'post').mockResolvedValueOnce({ data: {
      id: 12,
      venueId: 3,
      name: 'Festival Kaneko',
      startsAt: '2026-08-04T18:00:00Z',
      endsAt: '2026-08-04T23:00:00Z',
      timeZone: 'America/Sao_Paulo',
      status: 'RASCUNHO',
      reentryPolicy: 'ENTRADA_UNICA',
      version: 0,
    } });

    render(<EventsPage />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/Nome do evento/), 'Festival Kaneko');
    await user.type(screen.getByLabelText(/ID do local/), '3');
    await user.click(screen.getByRole('button', { name: 'Criar evento' }));

    await waitFor(() => expect(api.post).toHaveBeenCalledOnce());
    const [, payload, config] = vi.mocked(api.post).mock.calls[0];
    expect(payload).toMatchObject({ name: 'Festival Kaneko', venueId: 3 });
    expect(config?.headers).toHaveProperty('Idempotency-Key');
    expect(remember).toHaveBeenCalledWith('event', expect.objectContaining({ id: 12, version: 0 }));
  });
});
