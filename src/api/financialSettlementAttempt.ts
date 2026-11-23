import type { SettlementRequest } from './financialAccounts';

export interface FinancialSettlementAttempt { key: string; body: SettlementRequest }

/** Persistência de intenção, não de títulos: permite repetir a mesma baixa após reload/timeout. */
export function settlementAttemptStorageKey(org: number, login: string, tipo: string, id: number) {
  return `kaneko.financial-attempt.${org}.${encodeURIComponent(login)}.${tipo}.${id}`;
}

export function readSettlementAttempt(storageKey: string): FinancialSettlementAttempt | null {
  const raw = sessionStorage.getItem(storageKey);
  if (!raw) return null;
  const parsed = JSON.parse(raw) as FinancialSettlementAttempt;
  if (!parsed.key || !parsed.body || !Number.isFinite(parsed.body.valor) || parsed.body.valor <= 0) {
    throw new Error('Não foi possível recuperar a tentativa anterior. Consulte o histórico antes de registrar outra baixa.');
  }
  return parsed;
}

export function persistSettlementAttempt(storageKey: string, attempt: FinancialSettlementAttempt) {
  sessionStorage.setItem(storageKey, JSON.stringify(attempt));
}

export function clearSettlementAttempt(storageKey: string) { sessionStorage.removeItem(storageKey); }
