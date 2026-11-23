import type { Perfil } from './AuthContext';

export const EVENT_READ_PERMISSIONS = ['events:read'] as const;

const adminProfiles = ['ADMIN'] as const;
const geographyProfiles = ['ADMIN', 'OPERADOR'] as const;
const legacyProfilesByRoute: Readonly<Partial<Record<string, readonly Perfil[]>>> = {
  usuarios: adminProfiles,
  paises: geographyProfiles,
  estados: geographyProfiles,
  cidades: geographyProfiles,
};

/** Espelha as regras por perfil das rotas legadas no SecurityConfig da API. */
export function legacyAdministrationProfiles(route: string): readonly Perfil[] | undefined {
  return Object.prototype.hasOwnProperty.call(legacyProfilesByRoute, route) ? legacyProfilesByRoute[route] : undefined;
}

export function canDeleteLegacyResource(route: string, profile?: Perfil): boolean {
  return !legacyAdministrationProfiles(route) || profile === 'ADMIN';
}
