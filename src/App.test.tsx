import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { App } from './App';

vi.mock('./auth/ProtectedRoute', () => ({
  ProtectedRoute: ({ children }: { children: ReactNode }) => children,
}));

vi.mock('./auth/OrganizationAccessBoundary', () => ({
  OrganizationAccessBoundary: ({ children }: { children: ReactNode }) => children,
}));

vi.mock('./layout/AppLayout', async () => {
  const { Outlet } = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { AppLayout: () => <Outlet /> };
});

vi.mock('./components/crud/CrudResourcePage', () => ({
  CrudResourcePage: ({ config }: { config: { plural: string } }) => <h1>{config.plural}</h1>,
}));

vi.mock('./pages/PatioPage', () => ({ PatioPage: () => <h1>Patio legado</h1> }));
vi.mock('./pages/RelatoriosPage', () => ({ RelatoriosPage: () => <h1>Relatorios legados</h1> }));

describe('App - compatibilidade legada', () => {
  it.each([
    ['/app/notas-entrada', 'Notas de Entrada'],
    ['/app/notas-saida', 'Notas de Saída'],
    ['/app/produtos', 'Produtos'],
    ['/app/servicos', 'Serviços'],
  ])('mantem a rota %s acessivel', async (path, heading) => {
    render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);

    expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument();
  });

  it.each([
    ['/app/patio', 'Patio legado'],
    ['/app/relatorios', 'Relatorios legados'],
  ])('mantem a pagina operacional %s acessivel', async (path, heading) => {
    render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);

    expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument();
  });
});
