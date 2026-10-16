import { api, ifMatchHeaders } from './client';
import type { Page, PageParams } from './resource';
import type { ContaPagarResponse, NotaEntradaResponse } from '../types';
import type { StockMovement } from './stock';

export interface PurchaseDocuments {
  recebimentos: PurchaseReceipt[];
  notas: NotaEntradaResponse[] | null;
  contasPagar: ContaPagarResponse[] | null;
  movimentosEstoque: StockMovement[] | null;
}

export type PurchaseOrderStatus =
  | 'RASCUNHO'
  | 'APROVADA'
  | 'PARCIALMENTE_RECEBIDA'
  | 'RECEBIDA'
  | 'REJEITADA'
  | 'CANCELADA';

export type PurchaseFreightType = 'SEM_FRETE' | 'CIF' | 'FOB';

export interface PurchaseOrderItem {
  id: number;
  sequencia: number;
  produtoId: number;
  produtoNome: string;
  quantidadePedida: number;
  quantidadeRecebida: number;
  quantidadePendente: number;
  valorUnitario: number;
  codigoProdutoFornecedor?: string;
  valorDesconto: number;
  valorTotal: number;
  rateioFrete: number;
  rateioSeguro: number;
  rateioOutrasDespesas: number;
  custoTotal: number;
  custoUnitarioFinal: number;
}

export interface PurchaseOrder {
  id: number;
  numero: string;
  numeroNota: string;
  serieNota: string;
  modeloNota: string;
  fornecedorId: number;
  fornecedorNome: string;
  status: PurchaseOrderStatus;
  dataEmissao: string;
  previsaoEntrega?: string;
  condicaoPagamentoId?: number;
  condicaoPagamentoNome?: string;
  transportadoraId?: number;
  transportadoraNome?: string;
  localEstoqueEntregaId?: number;
  localEstoqueEntregaNome?: string;
  compradorId?: number;
  compradorNome?: string;
  tipoFrete?: PurchaseFreightType;
  referenciaFornecedor?: string;
  moeda: string;
  subtotal: number;
  valorFrete: number;
  valorSeguro: number;
  outrasDespesas: number;
  valorDesconto: number;
  valorTotal: number;
  observacao?: string;
  observacaoInterna?: string;
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
  fornecedorId: number;
  numeroNota: string;
  serieNota: string;
  modeloNota: string;
  dataEmissao?: string;
  previsaoEntrega?: string;
  condicaoPagamentoId?: number;
  transportadoraId?: number;
  localEstoqueEntregaId?: number;
  tipoFrete?: PurchaseFreightType;
  referenciaFornecedor?: string;
  moeda: string;
  valorFrete: number;
  valorSeguro: number;
  outrasDespesas: number;
  valorDesconto: number;
  observacao?: string;
  observacaoInterna?: string;
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

function optionalPositiveId(value: unknown, label: string): number | undefined {
  if (value === '' || value == null) return undefined;
  return positiveId(value, label);
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
  const tipoFrete = optionalText(values.tipoFrete) ?? 'SEM_FRETE';
  if (!['SEM_FRETE', 'CIF', 'FOB'].includes(tipoFrete)) {
    throw new Error('Responsavel pelo frete invalido.');
  }
  return {
    fornecedorId: positiveId(values.fornecedorId, 'Fornecedor'),
    numeroNota: text(values.numeroNota, 'Numero da nota').toUpperCase(),
    serieNota: text(values.serieNota, 'Serie da nota').toUpperCase(),
    modeloNota: text(values.modeloNota, 'Modelo da nota').toUpperCase(),
    ...(optionalText(values.dataEmissao) ? { dataEmissao: optionalText(values.dataEmissao) } : {}),
    ...(optionalText(values.previsaoEntrega)
      ? { previsaoEntrega: optionalText(values.previsaoEntrega) } : {}),
    ...(optionalPositiveId(values.condicaoPagamentoId, 'Condicao de pagamento')
      ? { condicaoPagamentoId: optionalPositiveId(values.condicaoPagamentoId, 'Condicao de pagamento') } : {}),
    ...(optionalPositiveId(values.transportadoraId, 'Transportadora')
      ? { transportadoraId: optionalPositiveId(values.transportadoraId, 'Transportadora') } : {}),
    ...(optionalPositiveId(values.localEstoqueEntregaId, 'Local previsto de entrega')
      ? { localEstoqueEntregaId: optionalPositiveId(values.localEstoqueEntregaId, 'Local previsto de entrega') } : {}),
    tipoFrete: tipoFrete as PurchaseFreightType,
    ...(optionalText(values.referenciaFornecedor)
      ? { referenciaFornecedor: optionalText(values.referenciaFornecedor) } : {}),
    moeda: (optionalText(values.moeda) ?? 'BRL').toUpperCase(),
    valorFrete: nonNegative(values.valorFrete, 'Frete'),
    valorSeguro: nonNegative(values.valorSeguro, 'Seguro'),
    outrasDespesas: nonNegative(values.outrasDespesas, 'Outras despesas'),
    // O contrato legado ainda exige o campo, mas a regra atual permite desconto somente por item.
    valorDesconto: 0,
    ...(optionalText(values.observacao) ? { observacao: optionalText(values.observacao) } : {}),
    ...(optionalText(values.observacaoInterna)
      ? { observacaoInterna: optionalText(values.observacaoInterna) } : {}),
    itens: itemRows(values).map((item) => {
      const quantidade = positive(item.quantidade, 'Quantidade');
      const valorUnitario = nonNegative(item.valorUnitario, 'Valor unitario');
      const valorDesconto = nonNegative(item.valorDesconto, 'Desconto do item');
      const totalItem = Math.round(quantidade * valorUnitario * 100) / 100;
      if (valorDesconto > totalItem) {
        throw new Error(`O desconto do item não pode exceder ${totalItem.toLocaleString('pt-BR', {
          style: 'currency', currency: 'BRL',
        })}.`);
      }
      return {
        produtoId: positiveId(item.produtoId, 'Produto'),
        quantidade,
        valorUnitario,
        valorDesconto,
      };
    }),
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
  documents: (id: number) => api.get<PurchaseDocuments>(`/api/v1/purchase-orders/${id}/documents`)
    .then((response) => response.data),
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
  rejectReceipt: (id: number, motivo: string, version: number) => api
    .post<PurchaseOrder>(`/api/v1/purchase-orders/${id}/receipt-rejection`, { motivo }, {
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
