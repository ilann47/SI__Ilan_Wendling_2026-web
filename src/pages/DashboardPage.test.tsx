import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { useOperationalWorkspace } from '../workspace/OperationalWorkspaceContext';
import { DashboardPage } from './DashboardPage';

vi.mock('../auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../workspace/OperationalWorkspaceContext', () => ({ useOperationalWorkspace: vi.fn() }));

afterEach(() => vi.restoreAllMocks());

describe('DashboardPage', () => {
  it('separa pagar e receber e abre apenas os títulos do indicador selecionado', async () => {
    vi.mocked(useAuth).mockReturnValue({ activeOrganization: { organizationId: 2 }, permissions: ['finance:read'] } as unknown as ReturnType<typeof useAuth>);
    vi.spyOn(api, 'get').mockResolvedValue({ data: {
      inicio: '2026-09-12', fim: '2026-09-18', totalAPagar: 100, totalAReceber: 250,
      vencidoAPagar: 0, vencidoAReceber: 0,
      aPagar: [{ id: 8, origem: 'DESPESA_AVULSA', contraparte: 'Energia', saldo: 100, vencimento: '2026-09-13', situacao: 'PENDENTE', vencido: false }],
      aReceber: [{ id: 9, origem: 'CONTA_RECEBER', contraparte: 'Cliente A', saldo: 250, vencimento: '2026-09-14', situacao: 'PARCIAL', vencido: false }],
    } });
    render(<MemoryRouter><QueryClientProvider client={new QueryClient()}><DashboardPage /></QueryClientProvider></MemoryRouter>);
    const user = userEvent.setup();
    expect(await screen.findByText('R$ 100,00')).toBeInTheDocument();
    expect(screen.getByText('R$ 250,00')).toBeInTheDocument();
    expect(screen.queryByText('R$ 350,00')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Ver contas a pagar do período' }));
    const drawer = screen.getByRole('dialog');
    expect(within(drawer).getByRole('link', { name: /Energia/ })).toHaveAttribute('href', '/app/contas-pagar-avulsas?detail=8');
    expect(within(drawer).queryByText('Cliente A')).not.toBeInTheDocument();
  });

  it('não transforma amostra sem pendências em total zero', async () => {
    vi.mocked(useAuth).mockReturnValue({ activeOrganization: { organizationId: 2 }, permissions: ['purchases:read'] } as unknown as ReturnType<typeof useAuth>);
    vi.spyOn(api, 'get').mockResolvedValue({ data: { content: [], totalElements: 50 } });
    render(<MemoryRouter><QueryClientProvider client={new QueryClient()}><DashboardPage /></QueryClientProvider></MemoryRouter>);
    expect(await screen.findByText(/Total de pendências indisponível/)).toBeInTheDocument();
  });
  it('apresenta decisões consultadas sem uma grade adicional de navegação', async () => {
    vi.mocked(useAuth).mockReturnValue({
      activeOrganization: { organizationId: 2, legalName: 'Kaneko' },
      permissions: ['audit:read', 'access:checkin'],
    } as unknown as ReturnType<typeof useAuth>);
    vi.mocked(useOperationalWorkspace).mockReturnValue({
      recent: (kind: string) => kind === 'event' ? [{ id: 5, label: 'Festival', updatedAt: '' }] : [],
    } as unknown as ReturnType<typeof useOperationalWorkspace>);
    vi.spyOn(api, 'get').mockImplementation(async (url) => {
      if (String(url).includes('availability')) return { data: { eventId: 5, totalAvailable: 23, items: [], guaranteesHold: false } };
      return { data: { items: [
        { id: 1, decision: 'AUTORIZADA' },
        { id: 2, decision: 'RECUSADA' },
      ], hasMore: false } };
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(<MemoryRouter><QueryClientProvider client={client}><DashboardPage /></QueryClientProvider></MemoryRouter>);

    expect(await screen.findByText('1 autorizados nas últimas 20 decisões')).toBeInTheDocument();
    expect(screen.getByText('Acessos recusados')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Resumo do dia' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Abrir console de acesso/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Check-in/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Pátio/ })).not.toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/api/v1/access-attempts', expect.objectContaining({
      params: expect.objectContaining({ limit: 20 }),
    }));
  });

  it('não consulta indicadores sem permissão nem inventa um resumo vazio', () => {
    vi.mocked(useAuth).mockReturnValue({
      activeOrganization: { organizationId: 2, legalName: 'Kaneko' },
      permissions: [],
    } as unknown as ReturnType<typeof useAuth>);
    const get = vi.spyOn(api, 'get');
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<MemoryRouter><QueryClientProvider client={client}><DashboardPage /></QueryClientProvider></MemoryRouter>);
    expect(screen.getByText(/O resumo não possui indicadores disponíveis para o seu acesso/)).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(get).not.toHaveBeenCalled();
  });

  it('explica quando as listas consultadas não possuem atividades', async () => {
    vi.mocked(useAuth).mockReturnValue({
      activeOrganization: { organizationId: 2, legalName: 'Kaneko' },
      permissions: ['purchases:read'],
    } as unknown as ReturnType<typeof useAuth>);
    vi.spyOn(api, 'get').mockResolvedValue({ data: { content: [], totalElements: 0 } });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<MemoryRouter><QueryClientProvider client={client}><DashboardPage /></QueryClientProvider></MemoryRouter>);
    expect(await screen.findByText('Nenhuma atividade adicional nas listas consultadas.')).toBeInTheDocument();
  });
});
