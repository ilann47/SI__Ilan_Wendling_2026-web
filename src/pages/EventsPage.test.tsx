import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api/client';
import { useOperationalWorkspace } from '../workspace/OperationalWorkspaceContext';
import { useAuth } from '../auth/AuthContext';
import { EventsPage } from './EventsPage';
import { fromApiDateTime } from '../utils/dateTime';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('../workspace/OperationalWorkspaceContext', () => ({
  useOperationalWorkspace: vi.fn(),
}));
vi.mock('../auth/AuthContext', () => ({ useAuth: vi.fn() }));

afterEach(() => vi.restoreAllMocks());

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><EventsPage /></QueryClientProvider>);
}

describe('EventsPage', () => {
  it('usa politica explicita ao atualizar evento legado sem politica', async () => {
    const remember = vi.fn();
    vi.mocked(useAuth).mockReturnValue({ permissions: ['events:create'] } as unknown as ReturnType<typeof useAuth>);
    vi.mocked(useOperationalWorkspace).mockReturnValue({
      recent: (kind: string) => kind === 'event' ? [{
        id: 1, label: 'Festival legado', version: 0, updatedAt: '', snapshot: {
          id: 1, venueId: 1, name: 'Festival legado', startsAt: '2026-08-04T03:00:00Z',
          endsAt: '2026-08-04T06:00:00Z', timeZone: 'America/Sao_Paulo', status: 'RASCUNHO',
          reentryPolicy: null, version: 0,
        },
      }] : [],
      remember,
    } as unknown as ReturnType<typeof useOperationalWorkspace>);
    vi.spyOn(api, 'patch').mockResolvedValueOnce({ data: {
      id: 1, venueId: 1, name: 'Festival legado', startsAt: '2026-08-04T03:00:00Z',
      endsAt: '2026-08-04T06:00:00Z', timeZone: 'America/Sao_Paulo', status: 'RASCUNHO',
      reentryPolicy: 'ENTRADA_UNICA', version: 1,
    } });

    renderPage();
    await userEvent.click(screen.getByRole('button', { name: 'Festival legado #1' }));
    await userEvent.click(screen.getByRole('button', { name: 'Executar operacao' }));

    await waitFor(() => expect(api.patch).toHaveBeenCalledOnce());
    expect(vi.mocked(api.patch).mock.calls[0][1]).toEqual({ reentryPolicy: 'ENTRADA_UNICA' });
  });

  it('herda janela e quota da alocacao real ao configurar produto', async () => {
    vi.mocked(useAuth).mockReturnValue({ permissions: ['pricing:manage'] } as unknown as ReturnType<typeof useAuth>);
    vi.mocked(useOperationalWorkspace).mockReturnValue({
      recent: (kind: string) => kind === 'allocation' ? [{
        id: 3,
        label: 'Evento 1 / Patio 1',
        version: 0,
        updatedAt: '',
        snapshot: {
          id: 3, eventId: 1, parkingFacilityId: 1,
          startsAt: '2026-08-04T03:34:00Z', endsAt: '2026-08-04T08:34:00Z',
          operationalCapacity: 10, sellableCapacity: 9, reservedCapacity: 1, version: 0,
        },
      }] : [],
      remember: vi.fn(),
    } as unknown as ReturnType<typeof useOperationalWorkspace>);

    renderPage();
    await userEvent.click(screen.getByRole('button', { name: 'Evento 1 / Patio 1 #3' }));

    expect(screen.getByLabelText(/ID do evento/)).toHaveValue(1);
    expect(screen.getByLabelText(/Quota/)).toHaveValue(9);
    expect(screen.getByLabelText(/Inicio do acesso/)).toHaveValue(fromApiDateTime('2026-08-04T03:34:00Z'));
    expect(screen.getByLabelText(/Fim do acesso/)).toHaveValue(fromApiDateTime('2026-08-04T08:34:00Z'));
  });

  it('mantem somente a consulta de disponibilidade para membro sem permissoes de configuracao', () => {
    vi.mocked(useAuth).mockReturnValue({ permissions: [] } as unknown as ReturnType<typeof useAuth>);
    vi.mocked(useOperationalWorkspace).mockReturnValue({
      recent: () => [], remember: vi.fn(),
    } as unknown as ReturnType<typeof useOperationalWorkspace>);

    renderPage();

    expect(screen.getByRole('tab', { name: 'Disponibilidade' })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Evento' })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Alocacao' })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Produto' })).not.toBeInTheDocument();
  });

  it('cria evento com contrato temporal e chave idempotente', async () => {
    const remember = vi.fn();
    vi.mocked(useAuth).mockReturnValue({ permissions: ['events:create'] } as unknown as ReturnType<typeof useAuth>);
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

    renderPage();
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

  it('lista eventos persistidos e permite seleciona-los', async () => {
    const remember = vi.fn();
    vi.mocked(useAuth).mockReturnValue({ permissions: ['events:read'],
      activeOrganization: { organizationId: 7 } } as unknown as ReturnType<typeof useAuth>);
    const workspace = { recent: () => [], remember } as unknown as
      ReturnType<typeof useOperationalWorkspace>;
    vi.mocked(useOperationalWorkspace).mockReturnValue(workspace);
    vi.spyOn(api, 'get').mockResolvedValueOnce({ data: { content: [{ id: 42, venueId: 3,
      name: 'Festival Persistido', startsAt: '2026-08-20T18:00:00Z', endsAt: '2026-08-20T23:00:00Z',
      timeZone: 'America/Sao_Paulo', status: 'RASCUNHO', reentryPolicy: null, version: 0 }],
      totalElements: 1, totalPages: 1 } });

    renderPage();

    expect(await screen.findByText('Festival Persistido')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Selecionar' }));
    expect(remember).toHaveBeenCalledWith('event', expect.objectContaining({ id: 42, version: 0 }));
  });
});
