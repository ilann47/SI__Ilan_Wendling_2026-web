import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ColorModeProvider } from '../context/ColorModeContext';
import { InboundNotesPage } from './InboundNotesPage';
import { inboundNotesApi } from '../api/inboundNotes';

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
    expect(screen.queryByRole('navigation', { name: 'Fluxo de compras' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Ordens de Compra|Recebimentos/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Histórico anterior' })).not.toBeInTheDocument();
  });
  it('envia filtros da URL e paginação ao servidor, sem filtrar só a página carregada', async () => {
    render(<ColorModeProvider><MemoryRouter initialEntries={['/app/notas-entrada?numero=NF&situacao=PENDENTE&fornecedorId=7']}><QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><InboundNotesPage /></QueryClientProvider></MemoryRouter></ColorModeProvider>);
    await screen.findByText('Nenhuma nota de entrada encontrada');
    expect(inboundNotesApi.list).toHaveBeenCalledWith(expect.objectContaining({ numero: 'NF', situacao: 'PENDENTE', fornecedorId: '7', page: 0, size: 10 }));
  });
});
