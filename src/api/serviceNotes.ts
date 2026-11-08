import { api, ifMatchHeaders } from './client';
import type { ContaReceberResponse, NotaServicoResponse } from '../types';

export interface ServiceNoteDetail {
  nota: NotaServicoResponse;
  contasReceber: ContaReceberResponse[] | null;
}

const base = '/api/notas-servico';
export const serviceNotesApi = {
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
