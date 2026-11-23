import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { RelatoriosPage } from './RelatoriosPage';

vi.mock('../auth/AuthContext', () => ({ useAuth: vi.fn() }));
afterEach(() => vi.restoreAllMocks());

it('abre o primeiro relatório autorizado quando a URL pede um relatório proibido', async () => {
  vi.mocked(useAuth).mockReturnValue({ activeOrganization: { organizationId: 1 },
    permissions: ['finance:read', 'fiscal:read'] } as unknown as ReturnType<typeof useAuth>);
  const get = vi.spyOn(api, 'get').mockResolvedValue({ data: { aPagar: [], aReceber: [] } });
  render(<MemoryRouter initialEntries={['/app/relatorios?tab=faturamento']}>
    <QueryClientProvider client={new QueryClient()}>
      <LocalizationProvider dateAdapter={AdapterDayjs}><RelatoriosPage /></LocalizationProvider>
    </QueryClientProvider>
  </MemoryRouter>);
  expect(screen.getAllByRole('tab')).toHaveLength(1);
  expect(screen.getByRole('tab', { name: 'Contas a vencer', selected: true })).toBeInTheDocument();
  await waitFor(() => expect(get.mock.calls.map(([url]) => url)).toEqual(['/api/relatorios/contas-a-vencer']));
});
