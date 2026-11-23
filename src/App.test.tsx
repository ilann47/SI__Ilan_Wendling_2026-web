import { render, screen } from '@testing-library/react';
import type { ComponentProps, ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';

vi.mock('./auth/ProtectedRoute', () => ({
  ProtectedRoute: ({ children }: { children: ReactNode }) => children,
}));

vi.mock('./auth/OrganizationAccessBoundary', () => ({
  OrganizationAccessBoundary: ({ children }: { children: ReactNode }) => children,
}));

const access = vi.hoisted(() => ({ enforce: false, permissions: ['operations:checkout'] }));
vi.mock('./auth/AuthContext', () => ({
  useAuth: () => ({ permissions: access.permissions, user: { perfil: 'USUARIO' } }),
}));
vi.mock('./auth/PermissionRoute', async (importOriginal) => {
  const { PermissionRoute } = await importOriginal<typeof import('./auth/PermissionRoute')>();
  return {
    PermissionRoute: (props: ComponentProps<typeof PermissionRoute>) => access.enforce
      ? <PermissionRoute {...props} />
      : <section data-permissions={props.anyOf?.join(',')}>{props.children}</section>,
  };
});

vi.mock('./layout/AppLayout', async () => {
  const { Outlet } = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { AppLayout: () => <Outlet /> };
});

vi.mock('./components/crud/CrudResourcePage', () => ({
  CrudResourcePage: ({ config }: { config: { plural: string } }) => <h1>{config.plural}</h1>,
}));

vi.mock('./pages/PatioPage', () => ({ PatioPage: () => <h1>Patio legado</h1> }));
vi.mock('./pages/EventsPage', () => ({ EventsPage: () => <h1>Eventos e ofertas</h1> }));
vi.mock('./pages/HubHomePage', () => ({ HubHomePage: () => <h1>Home Hub</h1> }));
vi.mock('./pages/RelatoriosPage', () => ({ RelatoriosPage: () => <h1>Relatorios legados</h1> }));
vi.mock('./pages/StockPage', () => ({ StockPage: () => <h1>Estoque</h1> }));
vi.mock('./pages/InboundNotesPage', () => ({ InboundNotesPage: () => <h1>Notas de Entrada</h1> }));
vi.mock('./pages/OutboundNotesPage', () => ({ OutboundNotesPage: () => <h1>Notas de Saída</h1> }));
vi.mock('./pages/OutboundNoteEditorPage', () => ({ OutboundNoteEditorPage: () => <h1>Editor da Nota de Saída</h1> }));
vi.mock('./pages/OutboundNoteDocumentPage', () => ({ OutboundNoteDocumentPage: () => <h1>Documento da Nota de Saída</h1> }));
vi.mock('./pages/ServiceOrdersPage', () => ({
  ServiceOrdersPage: () => <h1>Ordens de Servico</h1>,
}));

describe('App - compatibilidade legada', () => {
  beforeEach(() => { access.enforce = false; access.permissions = ['operations:checkout']; });

  it.each(['administracao', 'usuarios', 'eventos', 'paises', 'estados', 'cidades'])(
    'bloqueia /app/%s quando o caixa abre o endereço diretamente', async (path) => {
      access.enforce = true;
      render(<MemoryRouter initialEntries={[`/app/${path}`]}><App /></MemoryRouter>);
      expect(await screen.findByText('Acesso não autorizado')).toBeInTheDocument();
    },
  );
  it.each([
    ['patio', ['events:read', 'service_orders:read'], 'Patio legado'],
    ['relatorios', ['operations:checkout'], 'Relatorios legados'],
  ] as const)('nega %s antes de montar a página quando faltam permissões', async (path, permissions, heading) => {
    access.enforce = true;
    access.permissions = [...permissions];
    render(<MemoryRouter initialEntries={[`/app/${path}`]}><App /></MemoryRouter>);
    expect(await screen.findByText('Acesso não autorizado')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: heading })).not.toBeInTheDocument();
  });
  it('preserva o acesso do caixa ao Pátio', async () => {
    access.enforce = true;
    render(<MemoryRouter initialEntries={['/app/patio']}><App /></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: 'Patio legado' })).toBeInTheDocument();
  });
  it('não libera comprovantes para quem só pode consultar os veículos no pátio', async () => {
    access.enforce = true;
    access.permissions = ['operations:read'];
    render(<MemoryRouter initialEntries={['/app/patio/comprovantes/12']}><App /></MemoryRouter>);
    expect(await screen.findByText('Acesso não autorizado')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Patio legado' })).not.toBeInTheDocument();
  });
  it.each([
    ['/app/patio/comprovantes/12', 'Patio legado', 'operations:checkout,operations:manage'],
    ['/app/estoque/movimentos/12', 'Estoque', 'stock:read'],
    ['/app/ordens-servico/12', 'Ordens de Servico', 'service_orders:read'],
    ['/app/clientes/12', 'Clientes', 'customers:read'],
  ])('mantém a permissão de leitura da subpágina %s', async (path, heading, permission) => {
    render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);
    expect((await screen.findByRole('heading', { name: heading })).closest('[data-permissions]'))
      .toHaveAttribute('data-permissions', permission);
  });
  it.each(['/app', '/app/visao-geral', '/app/areas/estoque', '/app/areas/fiscal'])(
    'abre a home integrada em %s sem página intermediária', async (path) => {
      render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);
      expect(await screen.findByRole('heading', { name: 'Home Hub' })).toBeInTheDocument();
    },
  );
  it('protege a pagina de estoque com stock:read', async () => {
    render(<MemoryRouter initialEntries={['/app/estoque']}><App /></MemoryRouter>);

    const heading = await screen.findByRole('heading', { name: 'Estoque' });
    expect(heading.closest('[data-permissions]')).toHaveAttribute('data-permissions', 'stock:read');
  });

  it('não expõe a tela removida nem quando se usa um link salvo', async () => {
    render(<MemoryRouter initialEntries={['/app/vendas-administrativas?detail=42']}><App /></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: 'Home Hub' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Vendas Administrativas' })).not.toBeInTheDocument();
  });

  it('não abre despesas avulsas por um endereço salvo, mesmo com acesso ao financeiro', async () => {
    access.enforce = true;
    access.permissions = ['finance:read', 'finance:manage'];
    render(<MemoryRouter initialEntries={['/app/contas-pagar-avulsas?detail=8']}><App /></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: 'Home Hub' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Despesas avulsas' })).not.toBeInTheDocument();
  });

  it('protege ordens de servico com service_orders:read', async () => {
    render(<MemoryRouter initialEntries={['/app/ordens-servico']}><App /></MemoryRouter>);
    const heading = await screen.findByRole('heading', { name: 'Ordens de Servico' });
    expect(heading.closest('[data-permissions]')).toHaveAttribute('data-permissions', 'service_orders:read');
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
    ['/app/notas-saida/nova', 'Editor da Nota de Saída', 'fiscal:manage'],
    ['/app/notas-saida/12/editar', 'Editor da Nota de Saída', 'fiscal:manage'],
    ['/app/notas-saida/12', 'Documento da Nota de Saída', 'fiscal:read'],
  ])('protege a rota dedicada %s', async (path, heading, permission) => {
    render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);
    expect((await screen.findByRole('heading', { name: heading })).closest('[data-permissions]'))
      .toHaveAttribute('data-permissions', permission);
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
