import { describe, expect, it } from 'vitest';
import { navGroups } from './navigation';
import { areaMenuFor } from './areaNavigation';
import { quickActionsFor } from '../pages/AreaHomePage';

describe('navigation - areas por processo', () => {
  it('organiza destinos em seis áreas, com documentos no processo correspondente', () => {
    expect(navGroups).toHaveLength(6);
    expect(navGroups.map((group) => group.label)).toEqual([
      'Operação', 'Vendas', 'Estoque', 'Financeiro', 'Cadastros', 'Administração',
    ]);
  });

  it.each([
    ['/app/notas-entrada', 'Estoque'],
    ['/app/notas-saida', 'Vendas'],
    ['/app/notas-servico', 'Vendas'],
  ])('oferece %s em um único menu de processo', (path, group) => {
    expect(navGroups.filter((candidate) => candidate.items.some((item) => item.path === path))
      .map((candidate) => candidate.label)).toEqual([group]);
  });

  it('exibe os modulos legados junto dos modulos de eventos', () => {
    const items = navGroups.flatMap((group) => group.items);
    const pathsByLabel = Object.fromEntries(items.map((item) => [item.label, item.path]));

    expect(pathsByLabel).toMatchObject({
      'Acesso de eventos': '/app/acesso-eventos',
      'Pátio': '/app/patio',
      'Movimentações': '/app/movimentacoes',
      'Notas de Entrada': '/app/notas-entrada',
      'Notas de Saída': '/app/notas-saida',
      'Posição de Estoque': '/app/estoque',
      'Razão de estoque': '/app/estoque?tab=razao',
      Produtos: '/app/produtos',
      Serviços: '/app/servicos',
      'Contas a Pagar': '/app/contas-pagar',
      'Ordens de Serviço': '/app/ordens-servico',
    });
  });

  it('remove pedido de mercadoria dos dois menus e aponta a ação para a nota avulsa', () => {
    const items = [
      ...navGroups.flatMap((group) => group.items),
      ...(areaMenuFor('comercial')?.processGroups.flatMap((group) => group.items) ?? []),
      ...quickActionsFor('comercial', ['sales:read', 'fiscal:manage', 'service_orders:read']),
    ];
    expect(items.map(({ path }) => path)).not.toContain('/app/vendas-administrativas');
    expect(items.map(({ path }) => path)).toContain('/app/notas-saida/nova');
    expect(items.map(({ path }) => path)).toContain('/app/ordens-servico');
    expect(navGroups.flatMap((group) => group.items).some(({ path }) => path === '/app/vendas')).toBe(true);
  });

  it('exige leitura contextual para Ordens de Servico', () => {
    const item = navGroups.flatMap((group) => group.items)
      .find((candidate) => candidate.label === 'Ordens de Serviço');
    expect(item?.permissions).toEqual(['service_orders:read']);
  });

  it('não oferece criação de OC ou recebimento na navegação', () => {
    expect(navGroups.flatMap((group) => group.items).map((item) => item.path)).not.toContain('/app/ordens-compra');
    expect(navGroups.flatMap((group) => group.items).map((item) => item.path)).not.toContain('/app/recebimentos');
  });

  it.each(['Formas de Pagamento', 'Condições de Pagamento'])(
    'exige leitura contextual para %s',
    (label) => {
      const item = navGroups.flatMap((group) => group.items)
        .find((candidate) => candidate.label === label);

      expect(item?.permissions).toEqual(['payments:read']);
    },
  );

  it('exige leitura contextual para Clientes', () => {
    const item = navGroups.flatMap((group) => group.items)
      .find((candidate) => candidate.label === 'Clientes');

    expect(item?.permissions).toEqual(['customers:read']);
  });

  it('exige leitura contextual para Transportadoras', () => {
    const item = navGroups.flatMap((group) => group.items)
      .find((candidate) => candidate.label === 'Transportadoras');

    expect(item?.permissions).toEqual(['logistics:read']);
  });

  it.each(['Veículos de Frota', 'Frota (Transp. x Veículo)'])(
    'exige leitura contextual para %s',
    (label) => {
      const item = navGroups.flatMap((group) => group.items)
        .find((candidate) => candidate.label === label);

      expect(item?.permissions).toEqual(['logistics:read']);
    },
  );

  it('exige leitura contextual para Fornecedores', () => {
    const item = navGroups.flatMap((group) => group.items)
      .find((candidate) => candidate.label === 'Fornecedores');

    expect(item?.permissions).toEqual(['suppliers:read']);
  });

  it.each(['Produtos', 'Serviços', 'Categorias', 'Marcas', 'Unidades de Medida'])(
    'exige leitura contextual do catalogo para %s',
    (label) => {
      const item = navGroups.flatMap((group) => group.items)
        .find((candidate) => candidate.label === label);

      expect(item?.permissions).toEqual(['catalog:read']);
    },
  );

  it('exige leitura contextual do catalogo para Produto x Fornecedor', () => {
    const item = navGroups.flatMap((group) => group.items)
      .find((candidate) => candidate.label === 'Produto x Fornecedor');

    expect(item?.permissions).toEqual(['catalog:read']);
  });

  it('exige stock:read para Posição de Estoque', () => {
    const item = navGroups.flatMap((group) => group.items)
      .find((candidate) => candidate.label === 'Posição de Estoque');

    expect(item?.path).toBe('/app/estoque');
    expect(item?.permissions).toEqual(['stock:read']);
  });

  it('exige leitura contextual para Cargos', () => {
    const item = navGroups.flatMap((group) => group.items)
      .find((candidate) => candidate.label === 'Cargos');

    expect(item?.permissions).toEqual(['workforce:read']);
  });

  it('exige leitura contextual para Funcionários', () => {
    const item = navGroups.flatMap((group) => group.items)
      .find((candidate) => candidate.label === 'Funcionários');

    expect(item?.permissions).toEqual(['workforce:read']);
  });
});
