import { api } from './client';
import type { Page, PageParams } from './resource';

export type FinancialAccountType = 'pagar' | 'receber';
export interface FinancialOrigin { tipo: string; id: number | null; numero: string | null; url: string | null }
export interface FinancialAccount {
  id: number; organizacaoId: number; version: number;
  clienteNome?: string; fornecedorNome?: string;
  numeroParcela: number; totalParcelas: number;
  valorOriginal: number; valorTotal: number; valorPago?: number; valorRecebido?: number;
  valorDesconto: number; valorJuros: number; valorMulta: number; saldo: number;
  dataEmissao: string; dataVencimento: string; situacao: string; observacao?: string;
  origem: FinancialOrigin;
}
export interface FinancialSummary { quantidade: number; valorOriginal: number; valorTotal: number; valorBaixado: number; saldo: number }
export interface FinancialSettlement { id: number; valor: number; data: string | null; atorNome: string | null; saldoAnterior: boolean; registradoEm: string }
export interface SettlementRequest { valor: number; data?: string }

export function financialAccountsApi(tipo: FinancialAccountType) {
  const base = `/api/contas-${tipo}`;
  return {
    list: (params: PageParams) => api.get<Page<FinancialAccount>>(base, { params }).then((r) => r.data),
    summary: (params: PageParams) => api.get<FinancialSummary>(`${base}/resumo`, { params }).then((r) => r.data),
    get: (id: number) => api.get<FinancialAccount>(`${base}/${id}`).then((r) => r.data),
    history: (id: number) => api.get<FinancialSettlement[]>(`${base}/${id}/baixas`).then((r) => r.data),
    create: (body: Record<string, unknown>) => api.post<FinancialAccount>(base, body).then((r) => r.data),
    settle: (id: number, body: SettlementRequest, key: string) => api.post<FinancialAccount>(`${base}/${id}/baixa`, body,
      { headers: { 'Idempotency-Key': key } }).then((r) => r.data),
    cancel: (id: number) => api.post<FinancialAccount>(`${base}/${id}/cancelamento`).then((r) => r.data),
  };
}

export const financialOriginLabels: Record<string, string> = {
  MANUAL: 'Lançamento manual', NOTA_ENTRADA: 'Nota de entrada', NOTA_SAIDA: 'Nota de saída',
  NOTA_SERVICO: 'Nota de serviço', VENDA: 'Pedido de venda', MENSALIDADE: 'Mensalidade',
};
export function financialOriginPermission(tipo: string): string | null {
  if (tipo.startsWith('NOTA_')) return 'fiscal:read';
  if (tipo === 'VENDA') return 'sales:read';
  if (tipo === 'MENSALIDADE') return 'operations:read';
  return null;
}
