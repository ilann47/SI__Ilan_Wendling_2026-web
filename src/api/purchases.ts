import { api, ifMatchHeaders } from './client';
import type { Page, PageParams } from './resource';

export type PurchaseOrderStatus =
  | 'RASCUNHO'
  | 'APROVADA'
  | 'PARCIALMENTE_RECEBIDA'
  | 'RECEBIDA'
  | 'CANCELADA';

export interface PurchaseOrderItem {
  id: number;
  sequencia: number;
  produtoId: number;
  produtoNome: string;
  quantidadePedida: number;
  quantidadeRecebida: number;
  quantidadePendente: number;
  valorUnitario: number;
  valorDesconto: number;
  valorTotal: number;
}

export interface PurchaseOrder {
  id: number;
  numero: string;
  fornecedorId: number;
  fornecedorNome: string;
  status: PurchaseOrderStatus;
  dataEmissao: string;
  previsaoEntrega?: string;
  moeda: string;
  subtotal: number;
  valorFrete: number;
  valorDesconto: number;
  valorTotal: number;
  observacao?: string;
  motivoCancelamento?: string;
  version: number;
  itens: PurchaseOrderItem[];
}

export interface PurchaseReceiptItem {
  id: number;
  itemOrdemCompraId: number;
  produtoId: number;
  produtoNome: string;
  quantidade: number;
  custoUnitario: number;
  movimentoEstoqueId: number;
}

export interface PurchaseReceipt {
  id: number;
  ordemCompraId: number;
  localEstoqueId: number;
  localEstoqueNome: string;
  atorId: number;
  atorNome: string;
  recebidoEm: string;
  observacao?: string;
  itens: PurchaseReceiptItem[];
}

export interface PurchaseOrderRequest {
  numero: string;
  fornecedorId: number;
  dataEmissao?: string;
  previsaoEntrega?: string;
  moeda: string;
  valorFrete: number;
  valorDesconto: number;
  observacao?: string;
  itens: Array<{
    produtoId: number;
    quantidade: number;
    valorUnitario: number;
    valorDesconto: number;
  }>;
}

export interface PurchaseReceiptRequest {
  localEstoqueId: number;
  recebidoEm?: string;
  observacao?: string;
  itens: Array<{ itemOrdemCompraId: number; quantidade: number }>;
}

function positiveId(value: unknown, label: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) throw new Error(`${label} invalido.`);
  return parsed;
}

function nonNegative(value: unknown, label: string): number {
  if (value === '' || value == null) return 0;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`${label} invalido.`);
  return parsed;
}

function positive(value: unknown, label: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(`${label} deve ser positivo.`);
  return parsed;
}

function text(value: unknown, label: string): string {
  const parsed = typeof value === 'string' ? value.trim() : '';
  if (!parsed) throw new Error(`${label} obrigatorio.`);
  return parsed;
}

function optionalText(value: unknown): string | undefined {
  const parsed = typeof value === 'string' ? value.trim() : '';
  return parsed || undefined;
}

function itemRows(values: Record<string, unknown>): Array<Record<string, unknown>> {
  if (!Array.isArray(values.itens) || values.itens.length === 0) {
    throw new Error('Inclua ao menos um item.');
  }
  return values.itens as Array<Record<string, unknown>>;
}

export function buildPurchaseOrderPayload(values: Record<string, unknown>): PurchaseOrderRequest {
  return {
    numero: text(values.numero, 'Numero').toUpperCase(),
    fornecedorId: positiveId(values.fornecedorId, 'Fornecedor'),
    ...(optionalText(values.dataEmissao) ? { dataEmissao: optionalText(values.dataEmissao) } : {}),
    ...(optionalText(values.previsaoEntrega)
      ? { previsaoEntrega: optionalText(values.previsaoEntrega) } : {}),
    moeda: (optionalText(values.moeda) ?? 'BRL').toUpperCase(),
    valorFrete: nonNegative(values.valorFrete, 'Frete'),
    valorDesconto: nonNegative(values.valorDesconto, 'Desconto'),
    ...(optionalText(values.observacao) ? { observacao: optionalText(values.observacao) } : {}),
    itens: itemRows(values).map((item) => ({
      produtoId: positiveId(item.produtoId, 'Produto'),
      quantidade: positive(item.quantidade, 'Quantidade'),
      valorUnitario: nonNegative(item.valorUnitario, 'Valor unitario'),
      valorDesconto: nonNegative(item.valorDesconto, 'Desconto do item'),
    })),
  };
}

export function buildPurchaseReceiptPayload(
  values: Record<string, unknown>,
): PurchaseReceiptRequest {
  return {
    localEstoqueId: positiveId(values.localEstoqueId, 'Local de estoque'),
    ...(optionalText(values.recebidoEm) ? { recebidoEm: optionalText(values.recebidoEm) } : {}),
    ...(optionalText(values.observacao) ? { observacao: optionalText(values.observacao) } : {}),
    itens: itemRows(values).map((item) => ({
      itemOrdemCompraId: positiveId(item.itemOrdemCompraId, 'Item da ordem'),
      quantidade: positive(item.quantidade, 'Quantidade recebida'),
    })),
  };
}

export const purchaseApi = {
  list: (params: PageParams = {}) => api
    .get<Page<PurchaseOrder>>('/api/v1/purchase-orders', { params })
    .then((response) => response.data),
  get: (id: number) => api
    .get<PurchaseOrder>(`/api/v1/purchase-orders/${id}`)
    .then((response) => response.data),
  create: (body: PurchaseOrderRequest, key: string) => api
    .post<PurchaseOrder>('/api/v1/purchase-orders', body, {
      headers: { 'Idempotency-Key': key },
    }).then((response) => response.data),
  update: (id: number, body: PurchaseOrderRequest, version: number) => api
    .put<PurchaseOrder>(`/api/v1/purchase-orders/${id}`, body, {
      headers: ifMatchHeaders(version),
    }).then((response) => response.data),
  approve: (id: number, version: number) => api
    .post<PurchaseOrder>(`/api/v1/purchase-orders/${id}/approval`, null, {
      headers: ifMatchHeaders(version),
    }).then((response) => response.data),
  cancel: (id: number, motivo: string, version: number) => api
    .post<PurchaseOrder>(`/api/v1/purchase-orders/${id}/cancellation`, { motivo }, {
      headers: ifMatchHeaders(version),
    }).then((response) => response.data),
  receipts: (id: number) => api
    .get<PurchaseReceipt[]>(`/api/v1/purchase-orders/${id}/receipts`)
    .then((response) => response.data),
  receive: (id: number, body: PurchaseReceiptRequest, version: number, key: string) => api
    .post<PurchaseReceipt>(`/api/v1/purchase-orders/${id}/receipts`, body, {
      headers: { ...ifMatchHeaders(version), 'Idempotency-Key': key },
    }).then((response) => response.data),
};
