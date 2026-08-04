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

vi.mock('./auth/PermissionRoute', () => ({
  PermissionRoute: ({ anyOf, children }: { anyOf: string[]; children: ReactNode }) => (
    <section data-permissions={anyOf.join(',')}>{children}</section>
  ),
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
vi.mock('./pages/StockPage', () => ({ StockPage: () => <h1>Estoque</h1> }));

describe('App - compatibilidade legada', () => {
  it('protege a pagina de estoque com stock:read', async () => {
    render(<MemoryRouter initialEntries={['/app/estoque']}><App /></MemoryRouter>);

    const heading = await screen.findByRole('heading', { name: 'Estoque' });
    expect(heading.closest('[data-permissions]')).toHaveAttribute('data-permissions', 'stock:read');
  });

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

  it('protege a rota preservada de clientes com customers:read', async () => {
    render(<MemoryRouter initialEntries={['/app/clientes']}><App /></MemoryRouter>);

    const heading = await screen.findByRole('heading', { name: 'Clientes' });
    expect(heading.closest('[data-permissions]')).toHaveAttribute(
      'data-permissions',
      'customers:read',
    );
  });

  it('protege a rota preservada de transportadoras com logistics:read', async () => {
    render(<MemoryRouter initialEntries={['/app/transportadoras']}><App /></MemoryRouter>);

    const heading = await screen.findByRole('heading', { name: 'Transportadoras' });
    expect(heading.closest('[data-permissions]')).toHaveAttribute(
      'data-permissions',
      'logistics:read',
    );
  });

  it.each([
    ['/app/veiculos-frota', 'Veículos de Frota'],
    ['/app/transportadora-veiculos', 'Frota das Transportadoras'],
  ])('protege a rota preservada %s com logistics:read', async (path, title) => {
    render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);

    const heading = await screen.findByRole('heading', { name: title });
    expect(heading.closest('[data-permissions]')).toHaveAttribute(
      'data-permissions',
      'logistics:read',
    );
  });

  it('protege a rota preservada de fornecedores com suppliers:read', async () => {
    render(<MemoryRouter initialEntries={['/app/fornecedores']}><App /></MemoryRouter>);

    const heading = await screen.findByRole('heading', { name: 'Fornecedores' });
    expect(heading.closest('[data-permissions]')).toHaveAttribute(
      'data-permissions',
      'suppliers:read',
    );
  });

  it.each([
    ['/app/produtos', 'Produtos'],
    ['/app/servicos', 'Serviços'],
    ['/app/categorias', 'Categorias'],
    ['/app/marcas', 'Marcas'],
    ['/app/unidades-medida', 'Unidades de Medida'],
  ])('protege a rota preservada %s com catalog:read', async (path, title) => {
    render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);

    const heading = await screen.findByRole('heading', { name: title });
    expect(heading.closest('[data-permissions]')).toHaveAttribute(
      'data-permissions',
      'catalog:read',
    );
  });

  it('protege Produto x Fornecedor com catalog:read', async () => {
    render(<MemoryRouter initialEntries={['/app/produto-fornecedores']}><App /></MemoryRouter>);

    const heading = await screen.findByRole('heading', { name: 'Produtos por Fornecedor' });
    expect(heading.closest('[data-permissions]')).toHaveAttribute(
      'data-permissions',
      'catalog:read',
    );
  });

  it('protege a rota preservada de cargos com workforce:read', async () => {
    render(<MemoryRouter initialEntries={['/app/cargos']}><App /></MemoryRouter>);

    const heading = await screen.findByRole('heading', { name: 'Cargos' });
    expect(heading.closest('[data-permissions]')).toHaveAttribute(
      'data-permissions',
      'workforce:read',
    );
  });

  it('protege a rota preservada de funcionarios com workforce:read', async () => {
    render(<MemoryRouter initialEntries={['/app/funcionarios']}><App /></MemoryRouter>);

    const heading = await screen.findByRole('heading', { name: 'Funcionários' });
    expect(heading.closest('[data-permissions]')).toHaveAttribute(
      'data-permissions',
      'workforce:read',
    );
  });
});
