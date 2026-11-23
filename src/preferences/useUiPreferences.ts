import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import {
  readUiPreferences,
  rememberRecentPath,
  toggleFavoritePath,
  writeUiPreferences,
  type UiPreferences,
} from './uiPreferences';

export function useUiPreferences() {
  const { activeOrganization, user } = useAuth();
  const organizationId = activeOrganization?.organizationId;
  const login = user?.login ?? '';
  const [prefs, setPrefs] = useState<UiPreferences>(() => (
    organizationId && login ? readUiPreferences(organizationId, login) : readUiPreferences(0, 'anon')
  ));

  useEffect(() => {
    if (organizationId && login) setPrefs(readUiPreferences(organizationId, login));
  }, [login, organizationId]);

  const update = useCallback((patch: Partial<UiPreferences> | ((current: UiPreferences) => UiPreferences)) => {
    setPrefs((current) => {
      const next = typeof patch === 'function' ? patch(current) : { ...current, ...patch };
      if (organizationId && login) writeUiPreferences(organizationId, login, next);
      return next;
    });
  }, [login, organizationId]);

  const rememberPath = useCallback((path: string) => {
    update((current) => ({ ...current, recentPaths: rememberRecentPath(current.recentPaths, path) }));
  }, [update]);

  const toggleFavorite = useCallback((path: string) => {
    update((current) => ({ ...current, favoritePaths: toggleFavoritePath(current.favoritePaths, path) }));
  }, [update]);

  return { prefs, update, rememberPath, toggleFavorite };
}
