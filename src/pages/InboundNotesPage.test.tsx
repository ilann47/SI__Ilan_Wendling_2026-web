import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ColorModeProvider } from '../context/ColorModeContext';
import { InboundNotesPage } from './InboundNotesPage';

vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({
  activeOrganization: { organizationId: 2 }, permissions: ['fiscal:read'],
}) }));
vi.mock('../api/inboundNotes', () => ({ inboundNotesApi: {
  list: vi.fn().mockResolvedValue({ content: [], totalElements: 0, last: true }),
} }));

describe('InboundNotesPage - navegação enxuta', () => {
  it('não repete os atalhos que já estão na trilha de compras', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<ColorModeProvider><MemoryRouter><QueryClientProvider client={client}>
      <InboundNotesPage />
    </QueryClientProvider></MemoryRouter></ColorModeProvider>);
    expect(await screen.findByText('Nenhuma nota de entrada encontrada')).toBeInTheDocument();
    const process = screen.getByRole('navigation', { name: 'Fluxo de compras' });
    expect(screen.getAllByRole('link')).toEqual(within(process).getAllByRole('link'));
  });
});
