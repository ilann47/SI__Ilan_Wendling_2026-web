import type { Perfil } from './AuthContext';

export interface AccessPolicy {
  anyOf?: readonly string[];
  allOf?: readonly string[];
  profiles?: readonly Perfil[];
  oneOf?: readonly AccessPolicy[];
}

export function allowsAccess(
  permissions: readonly string[], { anyOf, allOf, profiles, oneOf }: AccessPolicy, profile?: Perfil,
): boolean {
  return (!anyOf || anyOf.some((permission) => permissions.includes(permission)))
    && (!allOf || allOf.every((permission) => permissions.includes(permission)))
    && (!profiles || (profile !== undefined && profiles.includes(profile)))
    && (!oneOf || oneOf.some((policy) => allowsAccess(permissions, policy, profile)));
}

// Espelha GET /api/relatorios/patio e a guarda de PatioCaixaController, respectivamente.
export const PATIO_VEHICLE_ACCESS = ['operations:read', 'operations:checkout'] as const;
export const PATIO_CASH_ACCESS = ['operations:checkout', 'operations:manage'] as const;
export const PATIO_PAGE_ACCESS = [...new Set([...PATIO_VEHICLE_ACCESS, ...PATIO_CASH_ACCESS])];

export const REPORTS = [
  { id: 'faturamento', label: 'Faturamento', allOf: ['operations:read', 'fiscal:read', 'finance:read'] },
  { id: 'contas', label: 'Contas a vencer', allOf: ['finance:read'] },
  { id: 'estoque', label: 'Estoque mínimo', allOf: ['stock:read'] },
  { id: 'mensalistas', label: 'Mensalistas ativos', allOf: ['operations:read'] },
] as const;

// Cada requisito do faturamento também permite um relatório próprio, exceto fiscal:read.
export const REPORTS_PAGE_ACCESS = [...new Set(REPORTS.slice(1).flatMap(({ allOf }) => [...allOf]))];

export const EVENT_ALLOCATION_ACCESS = { allOf: ['inventory:read'] } as const;
export const EVENT_PRICING_ACCESS = { allOf: ['pricing:read'] } as const;
export const EVENT_PRODUCT_WRITE_ACCESS = { allOf: ['pricing:manage', 'inventory:read'] } as const;

// A criação do vínculo exige users:invite; o seletor legado de usuários é ADMIN global.
export const MEMBERSHIP_INVITE_ACCESS = { allOf: ['users:invite'], profiles: ['ADMIN'] } as const;
export const ORGANIZATION_ADMIN_ACCESS = {
  oneOf: [{ anyOf: ['organizations:admin', 'roles:grant', 'roles:revoke'] }, MEMBERSHIP_INVITE_ACCESS],
} as const;
