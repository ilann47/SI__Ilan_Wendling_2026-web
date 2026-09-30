import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { useOperationalWorkspace } from '../workspace/OperationalWorkspaceContext';
import { EventAccessPage } from './EventAccessPage';

vi.mock('../auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../workspace/OperationalWorkspaceContext', () => ({ useOperationalWorkspace: vi.fn() }));

beforeEach(() => {
  vi.mocked(useAuth).mockReset();
  vi.mocked(useOperationalWorkspace).mockReset();
});

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

  it('gera uma nova tentativa depois de um sucesso, mesmo com a mesma leitura', async () => {
    vi.mocked(useAuth).mockReturnValue({ permissions: ['access:checkin'] } as unknown as ReturnType<typeof useAuth>);
    vi.mocked(useOperationalWorkspace).mockReturnValue({ recent: () => [], remember: vi.fn() } as unknown as ReturnType<typeof useOperationalWorkspace>);
    vi.spyOn(api, 'post')
      .mockResolvedValueOnce({ data: {
        accessAttemptId: 91, decision: 'AUTORIZADA', reasonCode: 'AUTORIZADA', decidedAt: '2026-08-03T04:00:00Z',
      } })
      .mockResolvedValueOnce({ data: {
        accessAttemptId: 92, decision: 'RECUSADA', reasonCode: 'ENTRADA_DUPLICADA', decidedAt: '2026-08-03T04:01:00Z',
      } });

    render(<EventAccessPage />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/QR da credencial/), 'token-seguro');
    await user.type(screen.getByLabelText(/ID do evento/), '5');
    await user.type(screen.getByLabelText(/ID do patio/), '7');
    const submit = screen.getByRole('button', { name: 'Registrar entrada' });

    await user.click(submit);
    await screen.findByText(/tentativa #91/);
    await user.click(submit);
    await screen.findByText(/tentativa #92/);

    const firstKey = vi.mocked(api.post).mock.calls[0][2]?.headers?.['Idempotency-Key'];
    const secondKey = vi.mocked(api.post).mock.calls[1][2]?.headers?.['Idempotency-Key'];
    expect(firstKey).toBeTruthy();
    expect(secondKey).toBeTruthy();
    expect(secondKey).not.toBe(firstKey);
  });

  it('confirma o bloqueio sem expor versão técnica ao operador', async () => {
    vi.mocked(useAuth).mockReturnValue({ permissions: ['credentials:block'] } as unknown as ReturnType<typeof useAuth>);
    vi.mocked(useOperationalWorkspace).mockReturnValue({ recent: () => [], remember: vi.fn() } as unknown as ReturnType<typeof useOperationalWorkspace>);
    vi.spyOn(api, 'post').mockResolvedValueOnce({ data: {
      id: 20, status: 'BLOQUEADA', version: 4,
    } });

    render(<EventAccessPage />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/Credencial/), '20');
    await user.type(screen.getByLabelText(/Motivo do bloqueio/), 'Perda informada');
    await user.click(screen.getByRole('button', { name: 'Bloquear credencial' }));
    await user.click(screen.getAllByRole('button', { name: 'Bloquear credencial' }).at(-1)!);

    expect(await screen.findByText('Credencial bloqueada com sucesso.')).toBeInTheDocument();
    expect(screen.queryByText(/ETag|versão 4/i)).not.toBeInTheDocument();
  });
});
