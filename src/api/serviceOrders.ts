import { api, ifMatchHeaders } from './client';
import type { Page, PageParams } from './resource';
import type { SaleReceivable } from './administrativeSales';

export type ServiceOrderStatus = 'RASCUNHO' | 'EM_EXECUCAO' | 'CONCLUIDA' | 'CANCELADA';
export interface ServiceOrderItem {
  id: number; sequencia: number; servicoId: number; servico: string; descricao: string;
  quantidade: number; valorUnitario: number; valorDesconto: number; valorTotal: number;
}
export interface ServiceOrder {
  id: number; version: number; numero: string; status: ServiceOrderStatus;
  clienteId: number; clienteNome: string; dataAbertura: string; previsaoConclusao?: string;
  iniciadaEm?: string; concluidaEm?: string; moeda: string; subtotal: number;
  valorDesconto: number; valorTotal: number; observacao?: string;
  motivoCancelamento?: string; itens: ServiceOrderItem[];
}
export interface ServiceOrderRequest {
  numero: string; clienteId: number; dataAbertura?: string; previsaoConclusao?: string;
  moeda: string; valorDesconto: number; observacao?: string;
  itens: Array<{ servicoId: number; quantidade: number; valorUnitario: number; valorDesconto: number }>;
}

export interface ServiceOrderNote {
  id: number; numero: string; modelo?: string; serie?: string;
  situacao: 'PENDENTE' | 'EMITIDA' | 'CANCELADA'; valorTotal: number; ordemServicoId?: number;
}
export interface ServiceOrderDocumentsResponse { nota: ServiceOrderNote | null; contas: SaleReceivable[] | null }
export interface ServiceOrderNoteRequest {
  numero: string; modelo?: string; serie?: string; dataEmissao?: string;
  condicaoPagamentoId?: number; formaPagamentoId?: number; aliquotaIss?: number;
}

export function buildServiceOrderNotePayload(values: Record<string, unknown>): ServiceOrderNoteRequest {
  const numero = typeof values.numero === 'string' ? values.numero.trim() : '';
  if (!numero || numero.length > 20) throw new Error('Informe o número da nota com até 20 caracteres.');
  const body: ServiceOrderNoteRequest = { numero };
  for (const field of ['modelo', 'serie', 'dataEmissao'] as const) {
    const value = typeof values[field] === 'string' ? values[field].trim() : '';
    if (value) body[field] = value;
  }
  for (const field of ['condicaoPagamentoId', 'formaPagamentoId'] as const) {
    if (values[field] !== '' && values[field] != null) body[field] = positiveId(values[field], 'Pagamento selecionado');
  }
  if (values.aliquotaIss !== '' && values.aliquotaIss != null) {
    const rate = Number(values.aliquotaIss);
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) throw new Error('Alíquota ISS deve estar entre 0 e 100.');
    body.aliquotaIss = rate;
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

export function buildServiceOrderPayload(values: Record<string, unknown>): ServiceOrderRequest {
  const numero = optional(values.numero);
  if (!numero) throw new Error('Numero obrigatorio.');
  if (!Array.isArray(values.itens) || values.itens.length === 0) {
    throw new Error('Inclua ao menos um servico.');
  }
  return {
    numero: numero.toUpperCase(), clienteId: positiveId(values.clienteId, 'Cliente'),
    ...(optional(values.dataAbertura) ? { dataAbertura: optional(values.dataAbertura) } : {}),
    ...(optional(values.previsaoConclusao)
      ? { previsaoConclusao: optional(values.previsaoConclusao) } : {}),
    moeda: (optional(values.moeda) ?? 'BRL').toUpperCase(),
    valorDesconto: number(values.valorDesconto, 'Desconto'),
    ...(optional(values.observacao) ? { observacao: optional(values.observacao) } : {}),
    itens: (values.itens as Array<Record<string, unknown>>).map((item) => ({
      servicoId: positiveId(item.servicoId, 'Servico'),
      quantidade: number(item.quantidade, 'Quantidade', true),
      valorUnitario: number(item.valorUnitario, 'Valor unitario'),
      valorDesconto: number(item.valorDesconto, 'Desconto do item'),
    })),
  };
}

export const serviceOrdersApi = {
  documents: (id: number) => api.get<ServiceOrderDocumentsResponse>(`/api/v1/service-orders/${id}/documents`)
    .then((response) => response.data),
  serviceNote: (id: number, body: ServiceOrderNoteRequest, key: string) => api.post<ServiceOrderNote>(
    `/api/v1/service-orders/${id}/service-note`, body,
    { headers: { 'Idempotency-Key': key } }).then((response) => response.data),
  issueNote: (id: number) => api.post<ServiceOrderNote>(`/api/notas-servico/${id}/emissao`, null)
    .then((response) => response.data),
  get: (id: number) => api.get<ServiceOrder>(`/api/v1/service-orders/${id}`).then((response) => response.data),
  list: (params: PageParams = {}) => api.get<Page<ServiceOrder>>(
    '/api/v1/service-orders', { params }).then((response) => response.data),
  create: (body: ServiceOrderRequest, key: string) => api.post<ServiceOrder>(
    '/api/v1/service-orders', body, { headers: { 'Idempotency-Key': key } })
    .then((response) => response.data),
  update: (id: number, body: ServiceOrderRequest, version: number) => api.put<ServiceOrder>(
    `/api/v1/service-orders/${id}`, body, { headers: ifMatchHeaders(version) })
    .then((response) => response.data),
  start: (id: number, version: number) => api.post<ServiceOrder>(
    `/api/v1/service-orders/${id}/start`, null, { headers: ifMatchHeaders(version) })
    .then((response) => response.data),
  complete: (id: number, version: number) => api.post<ServiceOrder>(
    `/api/v1/service-orders/${id}/completion`, null, { headers: ifMatchHeaders(version) })
    .then((response) => response.data),
  cancel: (id: number, motivo: string, version: number) => api.post<ServiceOrder>(
    `/api/v1/service-orders/${id}/cancellation`, { motivo },
    { headers: ifMatchHeaders(version) }).then((response) => response.data),
};
