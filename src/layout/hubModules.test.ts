import { describe, expect, it } from 'vitest';
import { canOpenHubModule, hubModules, moduleNavItems, resolveHubModule } from './hubModules';
import { areaMenuFor, visibleProcessGroups } from './areaNavigation';
import { quickActionsFor } from '../pages/AreaHomePage';

describe('hub areas navigation', () => {
  it('expõe seis áreas de processo sem Fiscal separado', () => {
    expect(hubModules.map((module) => module.id)).toEqual([
      'operacao', 'comercial', 'estoque', 'financeiro', 'cadastros', 'admin',
    ]);
  });

  it('abre Estoque na landing da área', () => {
    expect(hubModules.find((module) => module.id === 'estoque')?.homePath).toBe('/app/areas/estoque');
  });

  it('resolve módulo por path de área e por processo com query', () => {
    expect(resolveHubModule('/app/areas/estoque')?.id).toBe('estoque');
    expect(resolveHubModule('/app/estoque', '?tab=razao')?.id).toBe('estoque');
    expect(resolveHubModule('/app/notas-entrada')?.id).toBe('estoque');
    expect(resolveHubModule('/app/contas-pagar')?.id).toBe('financeiro');
    expect(resolveHubModule('/app/fornecedores')?.id).toBe('cadastros');
    expect(resolveHubModule('/app/clientes')?.id).toBe('cadastros');
    expect(resolveHubModule('/app/veiculos')?.id).toBe('operacao');
    expect(resolveHubModule('/app/tarifas')?.id).toBe('operacao');
    expect(resolveHubModule('/app/notas-saida')?.id).toBe('comercial');
    expect(resolveHubModule('/app/notas-servico')?.id).toBe('comercial');
    expect(resolveHubModule('/app/ordens-servico')?.id).toBe('operacao');
    expect(resolveHubModule('/app/eventos')?.id).toBe('operacao');
    expect(resolveHubModule('/app/vendas')?.id).toBe('operacao');
    expect(resolveHubModule('/app/instalacoes')?.id).toBe('operacao');
  });

  it('expõe mega menu por processo em todas as áreas', () => {
    for (const id of ['operacao', 'comercial', 'estoque', 'financeiro', 'cadastros', 'admin']) {
      expect(areaMenuFor(id)?.processGroups.length).toBeGreaterThan(0);
    }
  });

  it('separa a operação da ordem do acesso fiscal à nota de serviço', () => {
    const operation = areaMenuFor('operacao')!;
    const sales = areaMenuFor('comercial')!;
    const allowed = ['service_orders:read', 'fiscal:read'];
    const orders = visibleProcessGroups(operation, allowed).find(({ label }) => label === 'Serviços');
    expect(orders?.items.map(({ path }) => path)).toEqual(['/app/ordens-servico']);
    expect(visibleProcessGroups(operation, ['fiscal:read']).some(({ label }) => label === 'Serviços')).toBe(false);
    expect(visibleProcessGroups(sales, allowed).flatMap(({ items }) => items).map(({ path }) => path))
      .toEqual(['/app/notas-saida', '/app/notas-servico']);
    expect(quickActionsFor('operacao', ['service_orders:read']).map(({ path }) => path)).toContain('/app/ordens-servico');
    expect(quickActionsFor('comercial', allowed).map(({ path }) => path)).not.toContain('/app/ordens-servico');
  });

  it.each([
    ['events:read', '/app/eventos'],
    ['orders:read', '/app/vendas'],
  ])('mantém os dois atalhos com permissões independentes (%s)', (permission, path) => {
    const groups = visibleProcessGroups(areaMenuFor('operacao')!, [permission]);
    expect(groups.find(({ label }) => label === 'Eventos')?.items.map((item) => item.path)).toEqual([path]);
  });

  it('agrupa Estoque por Entradas, Estoque e Cadastro de produtos', () => {
    const menu = areaMenuFor('estoque');
    expect(menu?.processGroups.map((group) => group.label)).toEqual([
      'Entradas', 'Estoque', 'Cadastro de produtos',
    ]);
    const visible = visibleProcessGroups(menu!, [
      'fiscal:read', 'suppliers:read', 'stock:read', 'catalog:read',
    ]);
    expect(visible[0]?.items.map((item) => item.label)).toContain('Notas de Entrada');
    expect(visible[0]?.items.map((item) => item.label)).not.toContain('Recebimentos');
    expect(visible[1]?.items.map((item) => item.label)).toContain('Posição de Estoque');
    expect(visible[1]?.items.map((item) => item.label)).toContain('Razão de estoque');
  });

  it('filtra itens do módulo por permissão', () => {
    const estoque = hubModules.find((module) => module.id === 'estoque')!;
    expect(canOpenHubModule(estoque, ['stock:read'])).toBe(true);
    const labels = moduleNavItems(estoque, ['stock:read']).map((item) => item.label);
    expect(labels).toContain('Posição de Estoque');
    expect(labels).not.toContain('Ordens de Compra');
  });

  it('mostra Fornecedores em Cadastros apenas com leitura de fornecedores', () => {
    const cadastros = areaMenuFor('cadastros')!;
    const allowed = visibleProcessGroups(cadastros, ['suppliers:read']);
    expect(allowed.find(({ label }) => label === 'Clientes e fornecedores')?.items.map(({ path }) => path))
      .toEqual(['/app/fornecedores']);
    expect(visibleProcessGroups(cadastros, ['customers:read']).flatMap(({ items }) => items)
      .map(({ path }) => path)).not.toContain('/app/fornecedores');
    expect(visibleProcessGroups(areaMenuFor('estoque')!, ['suppliers:read', 'stock:read'])
      .flatMap(({ items }) => items).map(({ path }) => path)).not.toContain('/app/fornecedores');
  });

  it('agrupa Clientes e Fornecedores mantendo permissões independentes', () => {
    const cadastros = areaMenuFor('cadastros')!;
    const visible = (permissions: string[]) => visibleProcessGroups(cadastros, permissions)
      .find(({ label }) => label === 'Clientes e fornecedores')?.items.map(({ path }) => path);
    expect(visible(['customers:read'])).toEqual(['/app/clientes']);
    expect(visible(['customers:read', 'suppliers:read'])).toEqual(['/app/clientes', '/app/fornecedores']);
  });

  it('mostra Veículos e Tarifas no Estacionamento somente com leitura operacional', () => {
    const operacao = areaMenuFor('operacao')!;
    const visible = (permissions: string[]) => visibleProcessGroups(operacao, permissions)
      .find(({ label }) => label === 'Estacionamento')?.items.map(({ path }) => path);
    expect(visible(['operations:read'])).toEqual(expect.arrayContaining(['/app/veiculos', '/app/tarifas']));
    expect(visible(['operations:checkout'])).toEqual(['/app/patio']);
  });

  it('prioriza o trabalho do dia na área de estoque respeitando permissões', () => {
    expect(quickActionsFor('estoque', ['stock:read']).map((action) => action.label))
      .toEqual(['Consultar estoque']);
    expect(quickActionsFor('estoque', ['fiscal:manage']).map((action) => action.label)).toEqual([]);
    expect(quickActionsFor('estoque', ['fiscal:manage', 'fiscal:read', 'suppliers:read', 'catalog:read', 'stock:read'])
      .map((action) => action.label)).toEqual(['Lançar nota de entrada', 'Consultar estoque']);
  });
});
