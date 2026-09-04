import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
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
  it('apresenta disponibilidade e decisoes obtidas das APIs reais', async () => {
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
    expect(api.get).toHaveBeenCalledWith('/api/v1/access-attempts', expect.objectContaining({
      params: expect.objectContaining({ limit: 20 }),
    }));
  });
});
