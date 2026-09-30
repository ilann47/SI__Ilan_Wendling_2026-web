import dayjs from 'dayjs';
import type { Titulo } from '../types';

export type FinancialPeriod = 'today' | 'week' | 'month';

export function financialRange(period: FinancialPeriod, date = dayjs()) {
  const inicio = period === 'month' ? date.startOf('month') : date;
  const fim = period === 'month' ? date.endOf('month') : period === 'week' ? date.add(6, 'day') : date;
  return { inicio: inicio.format('YYYY-MM-DD'), fim: fim.format('YYYY-MM-DD'),
    label: `${inicio.format('DD/MM/YYYY')} a ${fim.format('DD/MM/YYYY')}` };
}

/** Somente origens conhecidas; nunca presume que toda saída é conta de fornecedor. */
export function financialTitlePath(title: Pick<Titulo, 'origem' | 'id'>): string | undefined {
  const paths: Record<string, string> = {
    CONTA_PAGAR: '/app/contas-pagar', CONTA_RECEBER: '/app/contas-receber',
    DESPESA_AVULSA: '/app/contas-pagar-avulsas',
  };
  return paths[title.origem] && Number.isSafeInteger(title.id) && title.id > 0
    ? `${paths[title.origem]}?detail=${title.id}` : undefined;
}
