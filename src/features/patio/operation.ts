import { asMicros, MICRO } from '../../utils/fixedDecimal';

export type OperationContext = { patioId: number; patioNome: string; eventoId?: number; eventoNome?: string };
export const contextStorageKey = (org: number, login: string) => `yes7parking.patio.context.${org}.${encodeURIComponent(login)}`;
export const PATIO_PLATE_MAX_LENGTH = 10;

export function normalizePatioPlate(value: string) {
  return value.trim().toUpperCase().replace(/^([A-Z]{3})-([0-9][A-Z0-9][0-9]{2})$/, '$1$2');
}

export function isValidPatioPlate(value: string) {
  const normalized = normalizePatioPlate(value);
  return normalized.length > 0 && normalized.length <= PATIO_PLATE_MAX_LENGTH
    && value.trim().length <= PATIO_PLATE_MAX_LENGTH && !/[\p{Cc}\p{Cf}]/u.test(value);
}

export function decimalInput(value: string) {
  const text = value.trim();
  return /^\d{1,12}(?:[.,]\d{1,6})?$/.test(text) ? text.replace(',', '.') : null;
}
export function cashChange(received: string, due: string | number) {
  const normalized = decimalInput(received);
  if (!normalized || !decimalInput(String(due))) return null;
  const change = asMicros(normalized) - asMicros(String(due));
  if (change < 0n) return null;
  return `${change / MICRO}.${(change % MICRO).toString().padStart(6, '0')}`;
}
export function readContext(org: number, login: string): OperationContext | null {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(contextStorageKey(org, login)) ?? 'null');
    if (!data || typeof data !== 'object') return null;
    const value = data as OperationContext;
    return Number.isSafeInteger(value.patioId) && value.patioId > 0 && typeof value.patioNome === 'string'
      && (value.eventoId === undefined || (Number.isSafeInteger(value.eventoId) && value.eventoId > 0))
      && (value.eventoNome === undefined || typeof value.eventoNome === 'string') ? value : null;
  } catch { return null; }
}
export function writeContext(org: number, login: string, value: OperationContext | null) {
  try {
    if (value) localStorage.setItem(contextStorageKey(org, login), JSON.stringify(value));
    else localStorage.removeItem(contextStorageKey(org, login));
  } catch { /* Um navegador sem armazenamento não deve impedir o caixa da sessão. */ }
}
export function currency(value: string | number): string {
  const [integer, fraction = ''] = String(value).split('.');
  return `${integer.startsWith('-') ? '−' : ''}R$ ${BigInt(integer).toLocaleString('pt-BR').replace(/^-/, '')},${fraction.replace(/0+$/, '').padEnd(2, '0')}`;
}
