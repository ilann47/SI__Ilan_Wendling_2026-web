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
});
