import type { Perfil } from './AuthContext';
import { canOpenAppPath } from './routeAccess';

/** Only called after an explicit organization selection; never redirects a logo click. */
export function organizationLanding(requested: string, permissions: readonly string[], profile?: Perfil): string {
  if (requested !== '/app' && requested !== '/app/' && canOpenAppPath(requested, permissions, profile)) return requested;
  return permissions.includes('operations:checkout') && !permissions.includes('operations:manage') ? '/app/patio' : '/app';
}
