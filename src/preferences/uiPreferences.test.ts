import { describe, expect, it } from 'vitest';
import {
  readUiPreferences,
  rememberRecentPath,
  rememberRecentSearch,
  toggleFavoritePath,
  uiPreferencesKey,
  writeUiPreferences,
} from './uiPreferences';

describe('uiPreferences', () => {
  it('particiona preferências por organização e login', () => {
    expect(uiPreferencesKey(7, 'admin')).toBe('kaneko.ui.7.admin');
  });

  it('persiste apenas preferências visuais', () => {
    writeUiPreferences(3, 'operador', {
      compactMenu: true,
      expandedGroups: { Operação: true },
      tableDensity: 'compact',
      recentSearches: ['abc'],
      favoritePaths: ['/app/patio'],
      recentPaths: ['/app'],
    });
    expect(readUiPreferences(3, 'operador')).toMatchObject({
      compactMenu: true,
      favoritePaths: ['/app/patio'],
    });
  });

  it('mantém buscas e rotas recentes sem dados empresariais', () => {
    expect(rememberRecentSearch(['patio'], 'cliente')).toEqual(['cliente', 'patio']);
    expect(rememberRecentPath(['/app/patio'], '/app/clientes')).toEqual(['/app/clientes', '/app/patio']);
    expect(rememberRecentPath([], '/app')).toEqual([]);
    expect(toggleFavoritePath(['/app/patio'], '/app/patio')).toEqual([]);
  });

  it('ignora atalhos locais antigos de Pedido de Venda sem afetar pedidos de evento', () => {
    const removed = '/app/vendas-administrativas?detail=7';
    const existing = '/app/vendas?tab=pedidos';
    localStorage.setItem(uiPreferencesKey(8, 'operador'), JSON.stringify({
      favoritePaths: [removed, existing], recentPaths: [removed, existing],
    }));
    expect(readUiPreferences(8, 'operador')).toMatchObject({
      favoritePaths: [existing], recentPaths: [existing],
    });
    expect(rememberRecentPath([existing], removed)).toEqual([existing]);
    expect(toggleFavoritePath([existing], removed)).toEqual([existing]);
  });
});
