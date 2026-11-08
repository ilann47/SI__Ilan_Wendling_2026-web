import { createResourceApi } from './resource';
import { api, ifMatchHeaders, getHttpStatus } from './client';
import { fiscalCommand } from './fiscalCommands';
import { asMicros, exactDecimal, MICRO } from '../utils/fixedDecimal';
import type { StockMovement } from './stock';
import type {
  ContaPagarResponse,
  NotaEntradaRequest,
  NotaEntradaResponse,
  TipoFrete,
} from '../types';

export interface NotaEntradaDetail {
  nota: NotaEntradaResponse;
  contasPagar: ContaPagarResponse[] | null;
  movimentosEstoque: StockMovement[] | null;
  previa?: InboundNotePreview;
}

function positiveId(value: unknown, label: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) throw new Error(`${label} inválido.`);
  return parsed;
}

function nonNegative(value: unknown, label: string): number { return exactDecimal(value, label); }
function positive(value: unknown, label: string): number { return exactDecimal(value, label, true); }

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
  const tipoFrete = optionalText(values.tipoFrete) as TipoFrete | undefined;
  if (tipoFrete && !['CIF', 'FOB', 'SEM'].includes(tipoFrete)) throw new Error('Tipo de frete inválido.');
  return {
    numero: text(values.numero, 'Número').toUpperCase(),
    ...(optionalId(values.transportadoraId) ? { transportadoraId: optionalId(values.transportadoraId) } : {}),
    ...(optionalText(values.observacaoInterna) ? { observacaoInterna: optionalText(values.observacaoInterna) } : {}),
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

function itemSubtotalMicros(item: {
  quantidade: number;
  valorUnitario: number;
  valorDesconto?: number;
}): bigint {
  const quantity = asMicros(String(item.quantidade));
  const unit = asMicros(String(item.valorUnitario));
  const net = (quantity * unit + MICRO / 2n) / MICRO - asMicros(String(item.valorDesconto ?? 0));
  return net > 0n ? net : 0n;
}

export function itemSubtotal(item: Parameters<typeof itemSubtotalMicros>[0]): number {
  return Number(itemSubtotalMicros(item)) / Number(MICRO);
}

export function noteTotals(values: {
  itens: Array<{ quantidade: number; valorUnitario: number; valorDesconto?: number }>;
  valorFrete?: number;
  valorSeguro?: number;
  outrasDespesas?: number;
  valorDesconto?: number;
}) {
  const produtos = values.itens.reduce((sum, item) => sum + itemSubtotalMicros(item), 0n);
  const [frete, seguro, outras, desconto] = [values.valorFrete, values.valorSeguro, values.outrasDespesas, values.valorDesconto]
    .map((valor) => asMicros(String(valor ?? 0)));
  const total = produtos + frete + seguro + outras - desconto;
  return {
    produtos: Number(produtos) / Number(MICRO),
    total: Number(total > 0n ? total : 0n) / Number(MICRO),
  };
}

const resource = createResourceApi<NotaEntradaResponse, NotaEntradaRequest>('/api/notas-entrada');

export const inboundNotesApi = {
  list: resource.list,
  get: resource.get,
  createIdempotent: (body: NotaEntradaRequest, key: string) => api
    .post<NotaEntradaResponse>('/api/notas-entrada', body, { headers: { 'Idempotency-Key': key } })
    .then((response) => response.data),
  preview: (body: NotaEntradaRequest, id?: number, version?: number) => api.post<InboundNotePreview>(
    id ? `/api/notas-entrada/${id}/previa` : '/api/notas-entrada/previa', body,
    id ? { headers: ifMatchHeaders(version!) } : undefined).then((response) => response.data),
  updateDraft: (id: number, body: NotaEntradaRequest, version: number) => api.put<NotaEntradaResponse>(
    `/api/notas-entrada/${id}`, body, { headers: ifMatchHeaders(version) }).then((response) => response.data),
  confirmRecoverable: async (id: number, version: number): Promise<NotaEntradaResponse> => {
    try {
      return (await api.post<NotaEntradaResponse>(`/api/notas-entrada/${id}/confirmacao`, null, { headers: ifMatchHeaders(version) })).data;
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
  cancel: (id: number, version: number) => api.post<NotaEntradaResponse>(`/api/notas-entrada/${id}/cancelamento`, null, { headers: ifMatchHeaders(version) }).then((response) => response.data),
  reverse: (id: number, version: number, motivo: string) => fiscalCommand<NotaEntradaResponse>(
    '/api/notas-entrada', id, 'reversao', version, { motivo }, (note) => note.situacao === 'CANCELADA' && !!note.revertidaEm,
  ),
  deleteDraft: (id: number, version: number) => api.delete(`/api/notas-entrada/${id}`, { headers: ifMatchHeaders(version) }).then(() => undefined),
};

export interface InboundNotePreview {
  nota: Omit<NotaEntradaResponse, 'id' | 'version' | 'createdAt' | 'updatedAt'> & { id: number | null; version: number | null; createdAt: string | null; updatedAt: string | null };
  parcelas: Array<{ numeroParcela: number; totalParcelas: number; valor: number; dataVencimento: string; formaPagamentoId: number | null; formaPagamentoNome: string | null }>;
  valorCustoTotal: number;
  valorObrigacao: number;
  diferencaDescontoGeral: number;
  custosMedios: Array<{
    sequencia: number;
    produtoId: number;
    saldoAnterior: number | null;
    custoMedioAnterior: number | null;
    quantidadeEntrada: number;
    custoUnitarioEntrada: number;
    custoMedioPosterior: number | null;
    aplicaAoEstoque: boolean;
    projecao: boolean;
  }>;
}
export function inboundNoteVersion(note: NotaEntradaResponse): number {
  if (!Number.isSafeInteger(note.version) || note.version! < 0) throw new Error('A versão da nota não está disponível. Recarregue o documento.');
  return note.version!;
}

/** Uma rejeição do replay antes de chegar ao serviço não resolve o POST anterior. */
export function canCorrectRejectedCreate(error: unknown, retryingUnknown: boolean): boolean {
  const status = getHttpStatus(error);
  if (retryingUnknown && [401, 403, 405, 415].includes(status ?? 0)) return false;
  return [400, 401, 403, 404, 405, 409, 415, 422].includes(status ?? 0);
}
