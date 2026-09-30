export type TableDensity = 'compact' | 'standard';

export interface UiPreferences {
  compactMenu: boolean;
  expandedGroups: Record<string, boolean>;
  tableDensity: TableDensity;
  recentSearches: string[];
  favoritePaths: string[];
  recentPaths: string[];
}

const empty: UiPreferences = {
  compactMenu: false,
  expandedGroups: {},
  tableDensity: 'standard',
  recentSearches: [],
  favoritePaths: [],
  recentPaths: [],
};

export function uiPreferencesKey(organizationId: number, login: string): string {
  return `kaneko.ui.${organizationId}.${login}`;
}

export function readUiPreferences(organizationId: number, login: string): UiPreferences {
  try {
    const raw = localStorage.getItem(uiPreferencesKey(organizationId, login));
    if (!raw) return { ...empty, expandedGroups: {} };
    const parsed = JSON.parse(raw) as Partial<UiPreferences>;
    return {
      compactMenu: parsed.compactMenu === true,
      expandedGroups: parsed.expandedGroups ?? {},
      tableDensity: parsed.tableDensity === 'compact' ? 'compact' : 'standard',
      recentSearches: Array.isArray(parsed.recentSearches)
        ? parsed.recentSearches.filter((item): item is string => typeof item === 'string').slice(0, 8)
        : [],
      favoritePaths: Array.isArray(parsed.favoritePaths)
        ? parsed.favoritePaths.filter((item): item is string => typeof item === 'string')
        : [],
      recentPaths: Array.isArray(parsed.recentPaths)
        ? parsed.recentPaths.filter((item): item is string => typeof item === 'string').slice(0, 8)
        : [],
    };
  } catch {
    return { ...empty, expandedGroups: {} };
  }
}

export function writeUiPreferences(
  organizationId: number,
  login: string,
  next: UiPreferences,
): void {
  localStorage.setItem(uiPreferencesKey(organizationId, login), JSON.stringify(next));
}

export function rememberRecentSearch(current: string[], term: string): string[] {
  const normalized = term.trim();
  if (normalized.length < 2) return current;
  return [normalized, ...current.filter((item) => item !== normalized)].slice(0, 8);
}

export function rememberRecentPath(current: string[], path: string): string[] {
  if (!path.startsWith('/app') || path === '/app') return current;
  return [path, ...current.filter((item) => item !== path)].slice(0, 8);
}

export function toggleFavoritePath(current: string[], path: string): string[] {
  return current.includes(path)
    ? current.filter((item) => item !== path)
    : [path, ...current];
}
