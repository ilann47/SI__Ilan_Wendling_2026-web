import { api, ifMatchHeaders } from './client';
import { fiscalCommand } from './fiscalCommands';
import { createResourceApi } from './resource';
import type { StockMovement } from './stock';
import type { ContaReceberResponse, NotaSaidaRequest, NotaSaidaResponse } from '../types';
import { asMicros, exactDecimal as decimal, MICRO } from '../utils/fixedDecimal';

export interface OutboundInstallment {
  numeroParcela: number;
  valor: number;
  dataVencimento: string;
  formaPagamentoId?: number | null;
  formaPagamentoNome?: string | null;
}

export interface OutboundNoteDetail {
  nota: NotaSaidaResponse;
  parcelas: OutboundInstallment[] | null;
  contasReceber: ContaReceberResponse[] | null;
  movimentosEstoque: StockMovement[] | null;
}

const notePath = '/api/notas-saida';
const resource = createResourceApi<NotaSaidaResponse, NotaSaidaRequest>(notePath);

export const outboundNotesApi = {
  list: resource.list,
  get: resource.get,
  details: (id: number) => api.get<OutboundNoteDetail>(`${notePath}/${id}/detalhes`).then(({ data }) => data),
  createDraft: (body: NotaSaidaRequest, key: string) => api.post<NotaSaidaResponse>(notePath, body, {
    headers: { 'Idempotency-Key': key },
  }).then(({ data }) => data),
  updateDraft: (id: number, body: NotaSaidaRequest, version: number) => api.put<NotaSaidaResponse>(
    `${notePath}/${id}`, body, { headers: ifMatchHeaders(version) },
  ).then(({ data }) => data),
  confirm: (id: number, version: number) => fiscalCommand<NotaSaidaResponse>(
    notePath, id, 'confirmacao', version, null, (note) => note.situacao === 'CONFIRMADA' || !!note.revertidaEm,
  ),
  reverse: (id: number, version: number, motivo: string) => fiscalCommand<NotaSaidaResponse>(
    notePath, id, 'reversao', version, { motivo }, (note) => note.situacao === 'CANCELADA' && !!note.revertidaEm,
  ),
  cancel: (id: number, version: number) => api.post<NotaSaidaResponse>(
    `${notePath}/${id}/cancelamento`, null, { headers: ifMatchHeaders(version) },
  ).then(({ data }) => data),
  deleteDraft: (id: number, version: number) => api.delete(`${notePath}/${id}`, { headers: ifMatchHeaders(version) }),
};

export function outboundNoteVersion(note: NotaSaidaResponse): number {
  if (note.version === undefined || !Number.isSafeInteger(note.version) || note.version < 0) {
    throw new Error('Recarregue a nota antes de continuar.');
  }
  return note.version;
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' ? value.trim() || undefined : undefined;
}

function id(value: unknown, label: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) throw new Error(`Selecione ${label}.`);
  return parsed;
}

/** Valores monetários e parcelas definitivos são calculados pelo servidor. */
export function buildNotaSaidaPayload(values: Record<string, unknown>): NotaSaidaRequest {
  const numero = text(values.numero)?.toUpperCase();
  if (!numero) throw new Error('Informe o número da nota.');
  const serie = text(values.serie);
  const modelo = text(values.modelo);
  const observacao = text(values.observacao);
  if (numero.length > 20 || (serie?.length ?? 0) > 10 || (modelo?.length ?? 0) > 10) {
    throw new Error('O número aceita até 20 caracteres; a série e o modelo aceitam até 10.');
  }
  if ((observacao?.length ?? 0) > 255) throw new Error('A observação aceita até 255 caracteres.');
  const dataEmissao = text(values.dataEmissao);
  const dataSaida = text(values.dataSaida);
  if (dataEmissao && dataSaida && dataSaida < dataEmissao) throw new Error('A saída não pode ser anterior à emissão.');
  const tipoFrete = text(values.tipoFrete);
  if (tipoFrete !== undefined && tipoFrete !== 'CIF' && tipoFrete !== 'FOB' && tipoFrete !== 'SEM') throw new Error('Tipo de frete inválido.');
  if (!Array.isArray(values.itens) || !values.itens.length) throw new Error('Inclua ao menos um produto.');
  const itens = (values.itens as Record<string, unknown>[]).map((item) => {
    const percentual = item.percentualDesconto === '' || item.percentualDesconto == null
      ? undefined : decimal(item.percentualDesconto, 'Desconto do item (%)');
    if (percentual !== undefined && percentual > 100) throw new Error('O desconto do item não pode ultrapassar 100%.');
    const desconto = item.valorDesconto === '' || item.valorDesconto == null
      ? undefined : decimal(item.valorDesconto, 'Desconto do item');
    if (desconto !== undefined && percentual !== undefined) throw new Error('Informe só o valor ou o percentual de desconto de cada item.');
    const quantidade = decimal(item.quantidade, 'Quantidade', true);
    const valorUnitario = decimal(item.valorUnitario, 'Valor unitário');
    const totalBrutoEmMicros = (asMicros(String(quantidade)) * asMicros(String(valorUnitario)) + MICRO / 2n) / MICRO;
    if (desconto !== undefined && asMicros(String(desconto)) > totalBrutoEmMicros) {
      throw new Error('O desconto não pode ultrapassar o valor total do item.');
    }
    return {
      produtoId: id(item.produtoId, 'um produto'),
      quantidade,
      valorUnitario,
      ...(desconto === undefined ? {} : { valorDesconto: desconto }),
      ...(percentual === undefined ? {} : { percentualDesconto: percentual }),
    };
  });
  return {
    numero, modelo, serie, dataEmissao, dataSaida, tipoFrete, observacao, itens,
    clienteId: id(values.clienteId, 'um cliente'),
    localEstoqueId: id(values.localEstoqueId, 'um local de estoque'),
    ...(values.condicaoPagamentoId ? { condicaoPagamentoId: id(values.condicaoPagamentoId, 'uma condição de pagamento') } : {}),
    valorFrete: decimal(values.valorFrete, 'Frete'),
    valorSeguro: decimal(values.valorSeguro, 'Seguro'),
    outrasDespesas: decimal(values.outrasDespesas, 'Outras despesas'),
    valorDesconto: decimal(values.valorDesconto, 'Desconto geral'),
  };
}
