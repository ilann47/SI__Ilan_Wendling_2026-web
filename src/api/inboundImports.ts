import { api, ifMatchHeaders } from './client';
import type { Page } from './resource';

export type InboundImportStatus = 'IMPORTADA' | 'CONCILIADA' | 'CONFERIDA' | 'CONFIRMADA';
export interface ImportedXmlItem {
  sequencia: number; codigo: string; descricao: string; unidade: string;
  quantidade: number; valorUnitario: number; valorProdutos: number; desconto: number;
}
export interface ReconciledImportItem {
  sequencia: number; produtoId: number; produtoNome: string; unidadeDestino: string;
  fatorConversao: number; quantidade: number; valorUnitario: number;
  quantidadeConferida?: number | null; itemOrdemCompraId?: number | null; motivoDivergencia?: string | null;
}
export interface InboundImportSummary {
  id: number; version: number; status: InboundImportStatus; chave: string;
  numero: string; emitenteNome: string; total: number; createdAt: string; notaEntradaId?: number | null;
}
export interface InboundImport {
  id: number; version: number; status: InboundImportStatus;
  documento: { chave: string; numero: string; serie: string; modelo: string;
    emitenteDocumento: string; emitenteNome: string; destinatarioDocumento: string;
    emissao: string; frete: number; seguro: number; outrasDespesas: number; total: number; itens: ImportedXmlItem[] };
  fornecedorId?: number | null; localEstoqueId?: number | null; condicaoPagamentoId?: number | null;
  ordemCompraId?: number | null; recebimentoCompraId?: number | null; notaEntradaId?: number | null;
  registrarNovoRecebimento?: boolean;
  itens: ReconciledImportItem[]; divergencias: string[];
}
export interface ReconcileImportRequest {
  fornecedorId: number; localEstoqueId: number; condicaoPagamentoId?: number;
  ordemCompraId?: number; recebimentoCompraId?: number;
  registrarNovoRecebimento?: boolean;
  itens: Array<{ sequencia: number; produtoId: number; fatorConversao: number; valorUnitario: number;
    itemOrdemCompraId?: number; motivoDivergencia?: string }>;
}
const path = '/api/notas-entrada/importacoes';

export function validateXmlFile(file: Pick<File, 'name' | 'size'>) {
  if (!file.name.toLowerCase().endsWith('.xml')) throw new Error('Selecione um arquivo XML.');
  if (file.size === 0) throw new Error('O arquivo está vazio.');
  if (file.size > 2 * 1024 * 1024) throw new Error('O arquivo deve possuir no máximo 2 MB.');
}

export const inboundImportsApi = {
  list: (page = 0) => api.get<Page<InboundImportSummary>>(path, { params: { page, size: 20, sort: 'createdAt,desc' } }).then((r) => r.data),
  get: (id: number) => api.get<InboundImport>(`${path}/${id}`).then((r) => r.data),
  upload: (xml: Blob | string) => api.post<InboundImport>(path, xml, { headers: { 'Content-Type': 'application/xml' } }).then((r) => r.data),
  reconcile: (id: number, version: number, body: ReconcileImportRequest) => api
    .put<InboundImport>(`${path}/${id}/conciliacao`, body, { headers: ifMatchHeaders(version) }).then((r) => r.data),
  count: (id: number, version: number, itens: Array<{ sequencia: number; quantidadeConferida: number }>) => api
    .post<InboundImport>(`${path}/${id}/conferencia`, { itens }, { headers: ifMatchHeaders(version) }).then((r) => r.data),
  confirm: async (id: number, version: number): Promise<InboundImport> => {
    try { return (await api.post<InboundImport>(`${path}/${id}/confirmacao`, null, { headers: ifMatchHeaders(version) })).data; }
    catch (error) {
      try { const current = await inboundImportsApi.get(id); if (current.status === 'CONFIRMADA') return current; }
      catch { /* Resultado inconclusivo preserva erro e não gera outro POST. */ }
      throw error;
    }
  },
};
