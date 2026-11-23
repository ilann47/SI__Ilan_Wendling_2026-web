import { api, ifMatchHeaders } from './client';
import type { Page } from './resource';
import type { FiscalPayer } from '../features/fiscal/payer';

export interface ParkingFiscalDraft {
  movimentacaoId: number;
  ordemServicoId: number | null;
  ordemServicoNumero: string | null;
  eventoNome: string;
  patioNome: string;
  placa: string;
  valor: string | number;
  status: string;
  criadoEm: string;
  version: number;
  tomador: FiscalPayer | null;
  tomadorInformado?: boolean;
  servicoId?: number | null;
  servicoNome?: string | null;
}

const base = '/api/v1/patio/rascunhos-nfse';
export const parkingFiscalDraftScope = 'parking-nfse-drafts';
export const parkingFiscalDraftPagePath = (id: number) => `/app/notas-servico/estacionamento/${id}`;

export const parkingFiscalDraftsApi = {
  list: (page: number, size: number, busca: string) =>
    api.get<Page<ParkingFiscalDraft>>(base, { params: { busca: busca || undefined, page, size } }).then((res) => res.data),
  detail: (id: number) =>
    api.get<ParkingFiscalDraft>(`${base}/${id}`).then((res) => res.data),
  updatePayer: (id: number, version: number, tomador: FiscalPayer | null) =>
    api.put<ParkingFiscalDraft>(`${base}/${id}/tomador`, { tomador }, { headers: ifMatchHeaders(version) }).then((res) => res.data),
};
