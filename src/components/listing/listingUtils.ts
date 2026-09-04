import type { FilterConfig } from '../crud/resourceConfig';
import { formatBool, formatCurrency, formatDate, formatDateTime, formatNumber, formatStatusLabel } from '../../utils/format';

export const UNAVAILABLE_API = 'Informação não disponibilizada pela API atual';

export function isFilled(value: unknown): boolean {
  return value !== undefined && value !== null && value !== '';
}

export function countAppliedFilters(values: Record<string, unknown>): number {
  return Object.values(values).filter(isFilled).length;
}

export function filterChipLabel(filter: FilterConfig, value: unknown): string {
  if (filter.type === 'boolean') return `${filter.label}: ${value === 'true' || value === true ? 'Sim' : 'Não'}`;
  if (filter.type === 'select') {
    const option = filter.options?.find((item) => item.value === String(value));
    return `${filter.label}: ${option?.label ?? String(value)}`;
  }
  return `${filter.label}: ${String(value)}`;
}

export function primarySearchFilter(filters: FilterConfig[]): FilterConfig | undefined {
  return filters.find((filter) => filter.type === 'text' && filter.name !== 'id');
}

export function formatDetailValue(value: unknown, field?: string): string {
  if (value === undefined || value === null || value === '') return '—';
  if (typeof value === 'boolean') return formatBool(value);
  if (typeof value === 'number') {
    if (field && /valor|preco|total|subtotal|frete|desconto|salario|custo/i.test(field)) {
      return formatCurrency(value);
    }
    return formatNumber(value, Number.isInteger(value) ? 0 : 3);
  }
  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}T/.test(value)) return formatDateTime(value);
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return formatDate(value);
    if (/status|situacao/i.test(field ?? '')) return formatStatusLabel(value);
    return value;
  }
  if (Array.isArray(value)) return `${value.length} item(ns)`;
  return String(value);
}

export function humanizeField(name: string): string {
  return name
    .replace(/Id$/, '')
    .replace(/Nome$/, '')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (letter) => letter.toUpperCase())
    .trim();
}

export interface DetailField {
  label: string;
  value: string;
}

export interface DetailSection {
  title: string;
  fields: DetailField[];
}

const IDENTIFICATION = ['id', 'numero', 'nome', 'placa', 'documento', 'descricao', 'titulo', 'login'];
const SITUATION = ['status', 'situacao', 'ativo', 'decision'];
const DATE_HINT = /data|At$|Em$|created|updated|inicio|fim|vencimento|emissao|abertura|previsao/i;
const VALUE_HINT = /valor|preco|total|subtotal|frete|desconto|quantidade|saldo|aliquota/i;
const PARTICIPANT_HINT = /cliente|fornecedor|transportadora|funcionario|usuario|responsavel|ator|condicao|forma/i;

export function buildDetailSections(row: Record<string, unknown>): DetailSection[] {
  const used = new Set<string>(['version', 'organizationId', 'organizacaoId']);
  const pick = (names: string[]) => names
    .filter((name) => name in row && !used.has(name))
    .map((name) => {
      used.add(name);
      return { label: humanizeField(name), value: formatDetailValue(row[name], name) };
    });

  const identification = pick(IDENTIFICATION);
  const situation = pick(SITUATION);
  const dates: DetailField[] = [];
  const values: DetailField[] = [];
  const participants: DetailField[] = [];
  const other: DetailField[] = [];

  for (const [name, value] of Object.entries(row)) {
    if (used.has(name) || name === 'itens' || name === 'items') continue;
    if (value && typeof value === 'object' && !Array.isArray(value)) continue;
    const field = { label: humanizeField(name), value: formatDetailValue(value, name) };
    used.add(name);
    if (DATE_HINT.test(name)) dates.push(field);
    else if (VALUE_HINT.test(name)) values.push(field);
    else if (PARTICIPANT_HINT.test(name)) participants.push(field);
    else other.push(field);
  }

  return [
    { title: 'Identificação', fields: identification },
    { title: 'Situação', fields: situation },
    { title: 'Datas', fields: dates },
    { title: 'Valores', fields: values },
    { title: 'Participantes', fields: participants },
    { title: 'Demais dados', fields: other },
  ].filter((section) => section.fields.length > 0);
}

export function highlightTerm(text: string, term: string): Array<{ text: string; match: boolean }> {
  if (!term.trim()) return [{ text, match: false }];
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'ig'));
  return parts.filter(Boolean).map((part) => ({
    text: part,
    match: part.toLowerCase() === term.toLowerCase(),
  }));
}
