import { api, ifMatchHeaders } from './client';
import type { Page, PageParams } from './resource';

export type AdministrativeSaleStatus = 'RASCUNHO' | 'CONFIRMADA' | 'CANCELADA';
export interface AdministrativeSaleItem {
  id: number; sequencia: number; produtoId: number; produtoNome: string;
  quantidade: number; valorUnitario: number; valorDesconto: number; valorTotal: number;
}
export interface AdministrativeSale {
  id: number; numero: string; clienteId: number; clienteNome: string;
  condicaoPagamentoId?: number; condicaoPagamentoNome?: string;
  localEstoqueId: number; localEstoqueNome: string; status: AdministrativeSaleStatus;
  dataEmissao: string; moeda: string; subtotal: number; valorDesconto: number;
  valorTotal: number; observacao?: string; motivoCancelamento?: string;
  version: number; itens: AdministrativeSaleItem[];
}
export interface AdministrativeSaleRequest {
  numero: string; clienteId: number; condicaoPagamentoId?: number;
  localEstoqueId: number; dataEmissao?: string; moeda: string;
  valorDesconto: number; observacao?: string;
  itens: Array<{ produtoId: number; quantidade: number; valorUnitario: number; valorDesconto: number }>;
}

const positiveId = (value: unknown, label: string) => {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) throw new Error(`${label} invalido.`);
  return parsed;
};
const number = (value: unknown, label: string, positive = false) => {
  const parsed = value === '' || value == null ? 0 : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || (positive && parsed === 0)) {
    throw new Error(`${label} invalido.`);
  }
  return parsed;
};
const optional = (value: unknown) => typeof value === 'string' && value.trim()
  ? value.trim() : undefined;

export function buildAdministrativeSalePayload(
  values: Record<string, unknown>,
): AdministrativeSaleRequest {
  const numero = optional(values.numero);
  if (!numero) throw new Error('Numero obrigatorio.');
  if (!Array.isArray(values.itens) || values.itens.length === 0) {
    throw new Error('Inclua ao menos um item.');
  }
  const condition = values.condicaoPagamentoId
    ? positiveId(values.condicaoPagamentoId, 'Condicao de pagamento') : undefined;
  return {
    numero: numero.toUpperCase(), clienteId: positiveId(values.clienteId, 'Cliente'),
    ...(condition ? { condicaoPagamentoId: condition } : {}),
    localEstoqueId: positiveId(values.localEstoqueId, 'Local de estoque'),
    ...(optional(values.dataEmissao) ? { dataEmissao: optional(values.dataEmissao) } : {}),
    moeda: (optional(values.moeda) ?? 'BRL').toUpperCase(),
    valorDesconto: number(values.valorDesconto, 'Desconto'),
    ...(optional(values.observacao) ? { observacao: optional(values.observacao) } : {}),
    itens: (values.itens as Array<Record<string, unknown>>).map((item) => ({
      produtoId: positiveId(item.produtoId, 'Produto'),
      quantidade: number(item.quantidade, 'Quantidade', true),
      valorUnitario: number(item.valorUnitario, 'Valor unitario'),
      valorDesconto: number(item.valorDesconto, 'Desconto do item'),
    })),
  };
}

export const administrativeSalesApi = {
  list: (params: PageParams = {}) => api.get<Page<AdministrativeSale>>(
    '/api/v1/administrative-sales', { params }).then((response) => response.data),
  create: (body: AdministrativeSaleRequest, key: string) => api.post<AdministrativeSale>(
    '/api/v1/administrative-sales', body, { headers: { 'Idempotency-Key': key } })
    .then((response) => response.data),
  update: (id: number, body: AdministrativeSaleRequest, version: number) => api
    .put<AdministrativeSale>(`/api/v1/administrative-sales/${id}`, body,
      { headers: ifMatchHeaders(version) }).then((response) => response.data),
  confirm: (id: number, version: number) => api.post<AdministrativeSale>(
    `/api/v1/administrative-sales/${id}/confirmation`, null,
    { headers: ifMatchHeaders(version) }).then((response) => response.data),
  cancel: (id: number, motivo: string, version: number) => api.post<AdministrativeSale>(
    `/api/v1/administrative-sales/${id}/cancellation`, { motivo },
    { headers: ifMatchHeaders(version) }).then((response) => response.data),
};
