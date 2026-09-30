import { createResourceApi } from './resource';
import { api } from './client';
import type { PurchaseOrderStatus, PurchaseReceipt } from './purchases';
import type { StockMovement } from './stock';
import type {
  ContaPagarResponse,
  NotaEntradaRequest,
  NotaEntradaResponse,
  TipoFrete,
} from '../types';

export interface LinkedPurchaseOrder {
  id: number;
  numero: string;
  status: PurchaseOrderStatus;
}

export interface NotaEntradaDetail {
  nota: NotaEntradaResponse;
  ordemCompra?: LinkedPurchaseOrder | null;
  recebimento?: PurchaseReceipt | null;
  contasPagar: ContaPagarResponse[] | null;
  movimentosEstoque: StockMovement[] | null;
}

function positiveId(value: unknown, label: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) throw new Error(`${label} inválido.`);
  return parsed;
}

function nonNegative(value: unknown, label: string): number {
  if (value === '' || value == null) return 0;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`${label} inválido.`);
  return parsed;
}

function positive(value: unknown, label: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(`${label} deve ser positivo.`);
  return parsed;
}

function text(value: unknown, label: string): string {
  const parsed = typeof value === 'string' ? value.trim() : '';
  if (!parsed) throw new Error(`${label} obrigatório.`);
  return parsed;
}

function optionalText(value: unknown): string | undefined {
  const parsed = typeof value === 'string' ? value.trim() : '';
  return parsed || undefined;
}

function optionalId(value: unknown): number | undefined {
  if (value === '' || value == null) return undefined;
  return positiveId(value, 'Identificador');
}

function itemRows(values: Record<string, unknown>): Array<Record<string, unknown>> {
  if (!Array.isArray(values.itens) || values.itens.length === 0) {
    throw new Error('Inclua ao menos um item.');
  }
  return values.itens as Array<Record<string, unknown>>;
}

/** Monta o payload fechado da Nota de Entrada a partir do formulário do wizard. */
export function buildNotaEntradaPayload(values: Record<string, unknown>): NotaEntradaRequest {
  const recebimentoCompraId = optionalId(values.recebimentoCompraId);
  const tipoFrete = optionalText(values.tipoFrete) as TipoFrete | undefined;
  return {
    numero: text(values.numero, 'Número').toUpperCase(),
    ...(optionalText(values.modelo) ? { modelo: optionalText(values.modelo) } : {}),
    ...(optionalText(values.serie) ? { serie: optionalText(values.serie) } : {}),
    fornecedorId: positiveId(values.fornecedorId, 'Fornecedor'),
    ...(optionalId(values.condicaoPagamentoId)
      ? { condicaoPagamentoId: optionalId(values.condicaoPagamentoId) }
      : {}),
    localEstoqueId: positiveId(values.localEstoqueId, 'Local de estoque'),
    ...(optionalText(values.dataEmissao) ? { dataEmissao: optionalText(values.dataEmissao) } : {}),
    ...(optionalText(values.dataChegada) ? { dataChegada: optionalText(values.dataChegada) } : {}),
    ...(tipoFrete ? { tipoFrete } : {}),
    valorFrete: nonNegative(values.valorFrete, 'Frete'),
    valorSeguro: nonNegative(values.valorSeguro, 'Seguro'),
    outrasDespesas: nonNegative(values.outrasDespesas, 'Outras despesas'),
    valorDesconto: nonNegative(values.valorDesconto, 'Desconto'),
    ...(optionalText(values.observacao) ? { observacao: optionalText(values.observacao) } : {}),
    ...(recebimentoCompraId ? { recebimentoCompraId } : {}),
    itens: itemRows(values).map((item) => ({
      produtoId: positiveId(item.produtoId, 'Produto'),
      quantidade: positive(item.quantidade, 'Quantidade'),
      valorUnitario: nonNegative(item.valorUnitario, 'Valor unitário'),
      ...(item.valorDesconto !== '' && item.valorDesconto != null
        ? { valorDesconto: nonNegative(item.valorDesconto, 'Desconto do item') }
        : {}),
      ...(item.percentualDesconto !== '' && item.percentualDesconto != null
        ? { percentualDesconto: nonNegative(item.percentualDesconto, '% desconto') }
        : {}),
    })),
  };
}

export function itemSubtotal(item: {
  quantidade: number;
  valorUnitario: number;
  valorDesconto?: number;
}): number {
  return Math.max(0, item.quantidade * item.valorUnitario - (item.valorDesconto ?? 0));
}

export function noteTotals(values: {
  itens: Array<{ quantidade: number; valorUnitario: number; valorDesconto?: number }>;
  valorFrete?: number;
  valorSeguro?: number;
  outrasDespesas?: number;
  valorDesconto?: number;
}) {
  const produtos = values.itens.reduce((sum, item) => sum + itemSubtotal(item), 0);
  const frete = values.valorFrete ?? 0;
  const seguro = values.valorSeguro ?? 0;
  const outras = values.outrasDespesas ?? 0;
  const desconto = values.valorDesconto ?? 0;
  return {
    produtos,
    total: Math.max(0, produtos + frete + seguro + outras - desconto),
  };
}

const resource = createResourceApi<NotaEntradaResponse, NotaEntradaRequest>('/api/notas-entrada');

export const inboundNotesApi = {
  ...resource,
  createIdempotent: (body: NotaEntradaRequest, key: string) => api
    .post<NotaEntradaResponse>('/api/notas-entrada', body, { headers: { 'Idempotency-Key': key } })
    .then((response) => response.data),
  confirmRecoverable: async (id: number): Promise<NotaEntradaResponse> => {
    try {
      return await resource.action('post', `/${id}/confirmacao`);
    } catch (error) {
      // Uma leitura confirma o efeito; nunca fazemos um segundo POST às cegas.
      try {
        const current = await resource.get(id);
        if (current.situacao === 'CONFIRMADA') return current;
      } catch { /* Preserva o erro do comando quando a consulta também falha. */ }
      throw error;
    }
  },
  details: (id: number) => api
    .get<NotaEntradaDetail>(`/api/notas-entrada/${id}/detalhes`)
    .then((response) => response.data),
  confirm: (id: number) => resource.action('post', `/${id}/confirmacao`),
  cancel: (id: number) => resource.action('post', `/${id}/cancelamento`),
};
