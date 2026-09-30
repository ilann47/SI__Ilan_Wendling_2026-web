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
    expect(resolveHubModule('/app/notas-saida')?.id).toBe('comercial');
    expect(resolveHubModule('/app/notas-servico')?.id).toBe('comercial');
  });

  it('expõe mega menu por processo em todas as áreas', () => {
    for (const id of ['operacao', 'comercial', 'estoque', 'financeiro', 'cadastros', 'admin']) {
      expect(areaMenuFor(id)?.processGroups.length).toBeGreaterThan(0);
    }
  });

  it('agrupa Estoque por Compras, Estoque e Cadastro de produtos', () => {
    const menu = areaMenuFor('estoque');
    expect(menu?.processGroups.map((group) => group.label)).toEqual([
      'Compras', 'Estoque', 'Cadastro de produtos',
    ]);
    const visible = visibleProcessGroups(menu!, [
      'purchases:read', 'fiscal:read', 'suppliers:read', 'stock:read', 'catalog:read',
    ]);
    expect(visible[0]?.items.map((item) => item.label)).toContain('Notas de Entrada');
    expect(visible[0]?.items.map((item) => item.label)).toContain('Recebimentos');
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

  it('prioriza o trabalho do dia na área de estoque respeitando permissões', () => {
    expect(quickActionsFor('estoque', ['purchases:read', 'stock:read']).map((action) => action.label))
      .toEqual(['Fazer um pedido', 'Receber mercadoria', 'Consultar estoque']);
    expect(quickActionsFor('estoque', ['fiscal:manage']).map((action) => action.label))
      .toEqual(['Lançar nota de entrada']);
  });
});
