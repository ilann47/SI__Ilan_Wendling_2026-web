import { api } from './client';
import type { EventResponse } from './eventCatalog';
import { tenantQueryKey } from './queryKeys';

export interface EventPatioSummary {
  eventoId: number; nome: string; status: string;
  preparacao: { localAtivo: boolean; alocacao: boolean; cobranca: boolean; politica: boolean;
    semVendaAntecipada: boolean; pronto: boolean; pendencias: string[] };
  operacao: { entradas: number; abertos: number; encerrados: number; cancelados: number; ocupacaoCredenciais: number };
  financeiro: null | { dinheiro: string; pix: string; cartao: string; total: string; turnosAbertos: number;
    turnosFechados: number; turnosMistos: number; diferencaDinheiro: string };
  fiscal: null | { pendentes: number; listaLimitada: boolean; itens: Array<{ movimentacaoId: number; placa: string;
    ordemServicoId: number; ordemServicoNumero: string; status: string; criadoEm: string }> };
}

export const eventPatioKey = (org: number, eventId: number) => tenantQueryKey(org, 'event-patio-operation', eventId);

export function eventPatioSummaryQuery(org?: number, event?: Pick<EventResponse, 'id' | 'version'>, canRead = true) {
  return {
    queryKey: org && event ? [...eventPatioKey(org, event.id), event.version] : ['event-patio-operation', 'inactive'],
    enabled: !!org && !!event && canRead,
    queryFn: ({ signal }: { signal: AbortSignal }) => {
      if (!org || !event || !canRead) throw new Error('Evento ou acesso à preparação indisponível.');
      return api.get<EventPatioSummary>(`/api/v1/events/${event.id}/patio-operation-summary`, { signal }).then(({ data }) => data);
    },
  };
}

export const portariaPreparationSteps = [
  { key: 'localAtivo', label: 'Local', help: 'Cadastre ou selecione o local onde o evento vai acontecer.' },
  { key: 'alocacao', label: 'Pátio e capacidade', help: 'Vincule um pátio e informe quantos carros podem entrar sem reserva.' },
  { key: 'cobranca', label: 'Preço e cobrança', help: 'Defina o valor e se o cliente paga na entrada ou na saída.' },
  { key: 'politica', label: 'Política de reentrada', help: 'Defina se o mesmo acesso permite retornar ao evento.' },
] as const;

export const isPreparingPortaria = (status: string) => status === 'RASCUNHO' || status === 'CONFIGURADO';
