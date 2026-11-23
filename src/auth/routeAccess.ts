import { configByKey } from '../resources';
import type { Perfil } from './AuthContext';
import { EVENT_READ_PERMISSIONS, legacyAdministrationProfiles } from './administrationAccess';
import {
  allowsAccess, ORGANIZATION_ADMIN_ACCESS, PATIO_CASH_ACCESS, PATIO_PAGE_ACCESS, REPORTS_PAGE_ACCESS, type AccessPolicy,
} from './accessPolicy';

function fiscalEditor(resource: 'notas-entrada' | 'notas-saida'): AccessPolicy {
  const config = configByKey[resource];
  return { anyOf: config.permissions?.create, allOf: ['fiscal:read', ...(config.requiredAllPermissions?.create ?? [])] };
}

export const routePolicies = {
  'acesso-eventos': { anyOf: ['access:validate', 'access:checkin', 'access:checkout', 'credentials:block'] },
  'tentativas-acesso': { anyOf: ['audit:read'] },
  administracao: ORGANIZATION_ADMIN_ACCESS,
  instalacoes: { anyOf: ['facilities:manage'] },
  eventos: { anyOf: EVENT_READ_PERMISSIONS },
  vendas: { anyOf: ['inventory:hold', 'orders:create', 'orders:read', 'orders:manual-confirm', 'orders:cancel', 'credentials:issue'] },
  bloqueios: { anyOf: ['organizations:admin', 'audit:read'] },
  patio: { anyOf: PATIO_PAGE_ACCESS },
  relatorios: { anyOf: REPORTS_PAGE_ACCESS },
  estoque: { anyOf: ['stock:read'] },
  'notas-entrada': { anyOf: ['fiscal:read'] },
  'notas-saida': { anyOf: ['fiscal:read'] },
  'notas-servico': { anyOf: ['fiscal:read'] },
  'contas-pagar': { anyOf: ['finance:read'] },
  'contas-receber': { anyOf: ['finance:read'] },
  'ordens-servico': { anyOf: ['service_orders:read'] },
} as const satisfies Readonly<Record<string, AccessPolicy>>;

export const inboundEditorAccess = fiscalEditor('notas-entrada');
export const outboundEditorAccess = fiscalEditor('notas-saida');
export const patioReceiptAccess = { anyOf: PATIO_CASH_ACCESS } satisfies AccessPolicy;

export function resourceRouteAccess(key: string): AccessPolicy {
  const config = Object.prototype.hasOwnProperty.call(configByKey, key) ? configByKey[key] : undefined;
  const profiles = legacyAdministrationProfiles(key);
  const anyOf = config?.permissions?.read;
  return profiles || anyOf?.length ? { profiles, anyOf } : { anyOf: [] };
}

export function canOpenAppPath(path: string, permissions: readonly string[], profile?: Perfil): boolean {
  if (!/^\/app(?:\/|[?#]|$)/.test(path)) return false;
  const [, , resource, segment, action] = path.split(/[?#]/, 1)[0].replace(/\/+$/, '').split('/');
  if (!resource) return true;
  if (resource === 'patio' && segment === 'comprovantes') {
    return allowsAccess(permissions, patioReceiptAccess, profile);
  }
  if (resource === 'notas-entrada' || resource === 'notas-saida') {
    if (segment === 'nova' || action === 'editar') {
      return allowsAccess(permissions, resource === 'notas-entrada' ? inboundEditorAccess : outboundEditorAccess, profile);
    }
  }
  const policy = Object.prototype.hasOwnProperty.call(routePolicies, resource)
    ? routePolicies[resource as keyof typeof routePolicies]
    : resourceRouteAccess(resource);
  return allowsAccess(permissions, policy, profile);
}
