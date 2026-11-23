import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '../../api/client';
import { FacilityEventSchedule } from './FacilityEventSchedule';

vi.mock('../../api/client', () => ({
  api: { get: vi.fn() },
  describeError: () => 'Consulta indisponível.',
}));

const mockGet = vi.mocked(api.get);
const zone = 'America/Sao_Paulo';
const response = { data: { operationalCapacity: 10, availableCapacity: 0, segments: [
  { startsAt: '2026-11-01T03:00:00Z', endsAt: '2026-11-24T13:00:00Z', availableCapacity: 0 },
  { startsAt: '2026-11-24T13:00:00Z', endsAt: '2026-11-24T15:00:00Z', availableCapacity: 3 },
  { startsAt: '2026-11-24T15:00:00Z', endsAt: '2026-12-01T03:00:00Z', availableCapacity: 0 },
] } };

function renderSchedule() {
  vi.setSystemTime(new Date('2026-11-22T13:00:00Z'));
  function Harness() {
    const [state, setState] = useState({ startsAt: '', endsAt: '' });
    return <FacilityEventSchedule organizationId={11} facilityId={42} timeZone={zone}
      {...state} onChange={setState} />;
  }
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<LocalizationProvider dateAdapter={AdapterDayjs}>
    <QueryClientProvider client={client}><Harness /></QueryClientProvider>
  </LocalizationProvider>);
}

afterEach(() => {
  vi.useRealTimers();
  mockGet.mockReset();
});

describe('agendamento do evento', () => {
  it('aguarda o saldo, bloqueia o dia lotado e permite apenas os horários livres do dia parcial', async () => {
    let complete!: (value: typeof response) => void;
    mockGet.mockImplementation(() => new Promise((resolve) => { complete = resolve; }));
    renderSchedule();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Data de início' }));
    expect(screen.getByText('Consultando disponibilidade…')).toBeInTheDocument();
    expect(screen.queryByRole('gridcell', { name: '24' })).not.toBeInTheDocument();
    complete(response);
    expect(await screen.findByRole('gridcell', { name: '25' })).toBeDisabled();
    const partial = screen.getByRole('gridcell', { name: '24' });
    expect(partial).toBeEnabled();
    await user.click(partial);
    await user.click(screen.getByRole('combobox', { name: 'Horário de início' }));
    expect(screen.getByRole('option', { name: '09:45' })).toHaveAttribute('aria-disabled', 'true');
    const free = screen.getByRole('option', { name: '10:00' });
    expect(free).toHaveAttribute('aria-disabled', 'false');
    expect(screen.getByRole('option', { name: '12:00' })).toHaveAttribute('aria-disabled', 'true');
    await user.click(free);
    expect(screen.getByRole('button', { name: 'Data de fim' })).toBeEnabled();
  });

  it('mostra somente o saldo devolvido para o intervalo exato selecionado', async () => {
    mockGet.mockImplementation(async (_url, config) => config?.params?.includeTimeline ? response : {
      data: { availableCapacity: 2, operationalCapacity: 10, segments: [] },
    });
    renderSchedule();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Data de início' }));
    await user.click(await screen.findByRole('gridcell', { name: '24' }));
    await user.click(screen.getByRole('combobox', { name: 'Horário de início' }));
    await user.click(screen.getByRole('option', { name: '10:00' }));
    await user.click(screen.getByRole('button', { name: 'Data de fim' }));
    await user.click(await screen.findByRole('gridcell', { name: '24' }));
    await user.click(screen.getByRole('combobox', { name: 'Horário de fim' }));
    expect(screen.getByRole('option', { name: '12:15' })).toHaveAttribute('aria-disabled', 'true');
    await user.click(screen.getByRole('option', { name: '12:00' }));
    await waitFor(() => expect(mockGet).toHaveBeenCalledWith('/api/v1/parking-facilities/42/availability',
      expect.objectContaining({ params: { startsAt: '2026-11-24T13:00:00.000Z',
        endsAt: '2026-11-24T15:00:00.000Z', includeTimeline: false } })));
    expect(await screen.findByText('2 vagas disponíveis durante todo o período.')).toBeInTheDocument();
  });
});
