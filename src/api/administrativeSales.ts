import { api, ifMatchHeaders } from './client';
import type { Page, PageParams } from './resource';
import type { StockMovement } from './stock';

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

/** Campos usados no vínculo; a resposta fiscal conserva o contrato completo existente. */
export interface SaleOutboundNote {
  id: number; numero: string; serie?: string; modelo?: string;
  situacao: 'PENDENTE' | 'CONFIRMADA' | 'CANCELADA'; valorTotal: number;
  vendaAdministrativaId?: number;
}
export interface SaleReceivable {
  id: number; numeroParcela: number; totalParcelas: number;
  dataVencimento: string; valorOriginal: number; valorRecebido: number;
  valorTotal: number; situacao: string;
}
export interface AdministrativeSaleDocuments {
  nota: SaleOutboundNote | null;
  contas: SaleReceivable[] | null;
  movimentos: StockMovement[] | null;
}
export interface SaleOutboundNoteRequest {
  numero: string; modelo?: string; serie?: string; dataEmissao?: string; dataSaida?: string;
}

export function buildSaleOutboundNotePayload(values: Record<string, unknown>): SaleOutboundNoteRequest {
  const numero = typeof values.numero === 'string' ? values.numero.trim() : '';
  if (!numero || numero.length > 20) throw new Error('Informe o número da nota com até 20 caracteres.');
  const body: SaleOutboundNoteRequest = { numero };
  for (const field of ['modelo', 'serie', 'dataEmissao', 'dataSaida'] as const) {
    const value = typeof values[field] === 'string' ? values[field].trim() : '';
    if (value) body[field] = value;
  }
  return body;
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
  get: (id: number) => api.get<AdministrativeSale>(`/api/v1/administrative-sales/${id}`)
    .then((response) => response.data),
  documents: (id: number) => api.get<AdministrativeSaleDocuments>(`/api/v1/administrative-sales/${id}/documents`)
    .then((response) => response.data),
  outboundNote: (id: number, body: SaleOutboundNoteRequest, key: string) => api.post<SaleOutboundNote>(
    `/api/v1/administrative-sales/${id}/outbound-note`, body,
    { headers: { 'Idempotency-Key': key } }).then((response) => response.data),
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
