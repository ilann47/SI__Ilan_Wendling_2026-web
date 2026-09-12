import type { PerfilUsuario } from '../../types';

export interface MeProfile {
  id: number;
  login?: string;
  nome?: string;
  email?: string;
  /** Pode ausentar em algumas respostas; o UI usa fallback da sessao. */
  perfil?: PerfilUsuario;
}

export interface OrganizationCreateRequest {
  document: string;
  legalName: string;
  tradeName: string | null;
  currency: string;
  timeZone: string;
  region: string;
  plan: string;
}

export interface OrganizationSummary {
  id: number;
  document: string;
  legalName: string;
  tradeName?: string | null;
  currency: string;
  timeZone: string;
  region: string;
  plan: string;
  status: string;
  version: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface MembershipSummary {
  id: number;
  organizationId: number;
  userId: number;
  status: string;
  origin: string;
  joinedAt?: string;
  version: number;
  createdAt?: string;
  updatedAt?: string;
}

/** Resposta de POST /api/v1/me/organizations (self-service USUARIO). */
export interface SelfServiceOrganizationCreateResponse {
  organization: OrganizationSummary;
  membership: MembershipSummary;
}

export type OrganizationFormValues = {
  document: string;
  legalName: string;
  tradeName: string;
  currency: string;
  timeZone: string;
  region: string;
  plan: string;
};

export const DEFAULT_ORGANIZATION_FORM: OrganizationFormValues = {
  document: '',
  legalName: '',
  tradeName: '',
  currency: 'BRL',
  timeZone: 'America/Sao_Paulo',
  region: 'BR-SP',
  plan: 'ENTERPRISE',
};

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

/** Máscara visual de CNPJ (##.###.###/####-##). */
export function formatCnpjMask(value: string): string {
  const digits = digitsOnly(value).slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

export function toOrganizationCreateRequest(values: OrganizationFormValues): OrganizationCreateRequest {
  return {
    document: digitsOnly(values.document),
    legalName: values.legalName.trim(),
    tradeName: values.tradeName.trim() || null,
    currency: values.currency.trim().toUpperCase(),
    timeZone: values.timeZone.trim(),
    region: values.region.trim().toUpperCase(),
    plan: values.plan.trim().toUpperCase(),
  };
}
