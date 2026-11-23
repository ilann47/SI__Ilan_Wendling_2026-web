import { api, ifMatchHeaders } from './client';
import type { Page } from './resource';
import type { ContaReceberResponse, NotaServicoResponse } from '../types';

export interface ServiceNoteDetail {
  nota: NotaServicoResponse;
  contasReceber: ContaReceberResponse[] | null;
}

export type ServiceNoteOrigin = 'ESTACIONAMENTO' | 'MANUAL' | 'ORDEM_SERVICO';
export type ServiceNoteListStatus = 'PENDENTE_EMISSAO' | 'PENDENTE' | 'EMITIDA' | 'CANCELADA';
export interface ServiceNoteListRow {
  id: number;
  origem: ServiceNoteOrigin;
  referencia: string;
  descricao: string;
  criadoEm: string;
  valor: string;
  situacao: ServiceNoteListStatus;
}

export interface ServiceNoteListParams {
  page: number;
  size: number;
  busca?: string;
  origem?: ServiceNoteOrigin;
  situacao?: Exclude<ServiceNoteListStatus, 'PENDENTE_EMISSAO'>;
  clienteId?: number;
}

const base = '/api/notas-servico';
export const serviceNotesApi = {
  list: (params: ServiceNoteListParams) => api.get<Page<ServiceNoteListRow>>(`${base}/listagem`, { params }).then((res) => res.data),
  create: (values: Record<string, unknown>) => api.post<NotaServicoResponse>(base, values).then((res) => res.data),
  detail: (id: number) => api.get<ServiceNoteDetail>(`${base}/${id}/detalhes`).then((res) => res.data),
  update: (id: number, body: Record<string, unknown>, version: number) =>
    api.put<NotaServicoResponse>(`${base}/${id}`, body, { headers: ifMatchHeaders(version) }),
  issue: (id: number, version: number) =>
    api.post<NotaServicoResponse>(`${base}/${id}/emissao`, null, { headers: ifMatchHeaders(version) }),
  cancel: (id: number, motivo: string, version: number) =>
    api.post<NotaServicoResponse>(`${base}/${id}/cancelamento`, { motivo }, { headers: ifMatchHeaders(version) }),
  removeDraft: (id: number, version: number) =>
    api.delete(`${base}/${id}`, { headers: ifMatchHeaders(version) }),
};
