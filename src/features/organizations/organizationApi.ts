import { api } from '../../api/client';
import type { AccessibleOrganization } from '../../auth/AuthContext';
import type {
  MeProfile,
  OrganizationCreateRequest,
  OrganizationSummary,
  SelfServiceOrganizationCreateResponse,
} from './organizationTypes';

export async function fetchMeProfile(): Promise<MeProfile> {
  const { data } = await api.get<MeProfile & Record<string, unknown>>('/api/v1/me');
  const rawPerfil = data.perfil
    ?? (data as { role?: string }).role
    ?? (data as { globalPerfil?: string }).globalPerfil;
  const perfil = rawPerfil === 'ADMIN' || rawPerfil === 'OPERADOR' || rawPerfil === 'USUARIO'
    ? rawPerfil
    : undefined;
  return {
    id: data.id,
    login: data.login,
    nome: data.nome,
    email: data.email,
    perfil,
  };
}

export async function fetchAccessibleOrganizations(): Promise<AccessibleOrganization[]> {
  const { data } = await api.get<AccessibleOrganization[]>('/api/v1/me/organizations');
  return data;
}

export async function createOrganizationAsUsuario(
  payload: OrganizationCreateRequest,
): Promise<SelfServiceOrganizationCreateResponse> {
  const { data } = await api.post<SelfServiceOrganizationCreateResponse>(
    '/api/v1/me/organizations',
    payload,
  );
  return data;
}

export async function createOrganizationAsAdmin(
  payload: OrganizationCreateRequest,
): Promise<OrganizationSummary> {
  const { data } = await api.post<OrganizationSummary>('/api/v1/organizations', payload);
  return data;
}

export async function createOrganizationMembership(
  organizationId: number,
  userId: number,
): Promise<void> {
  await api.post(`/api/v1/organizations/${organizationId}/memberships`, { userId });
}
