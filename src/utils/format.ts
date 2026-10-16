import dayjs from 'dayjs';

export function formatCurrency(value?: number | null, currency = 'BRL'): string {
  if (value === null || value === undefined) return '—';
  return value.toLocaleString('pt-BR', { style: 'currency', currency });
}

export function formatNumber(value?: number | null, digits = 0): string {
  if (value === null || value === undefined) return '—';
  return value.toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function formatPercent(value?: number | null): string {
  if (value === null || value === undefined) return '—';
  return `${value.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`;
}

export function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = dayjs(iso);
  return d.isValid() ? d.format('DD/MM/YYYY') : '—';
}

export function formatDateTime(iso?: string | null): string {
  if (!iso) return '—';
  const d = dayjs(iso);
  return d.isValid() ? d.format('DD/MM/YYYY HH:mm') : '—';
}

export function formatBool(value?: boolean | null): string {
  return value ? 'Sim' : 'Não';
}

export function minutesToHuman(min?: number | null): string {
  if (min === null || min === undefined) return '—';
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h === 0 ? `${m}min` : `${h}h${m.toString().padStart(2, '0')}`;
}

export function formatStatusLabel(status?: string | null): string {
  if (!status) return '—';
  const knownLabels: Record<string, string> = {
    EM_EXECUCAO: 'Em execução',
    CONCLUIDA: 'Concluída',
    FISICA: 'Física',
    JURIDICA: 'Jurídica',
    VIUVO: 'Viúvo',
    SAIDA: 'Saída',
    OPERACAO: 'Operação',
  };
  if (knownLabels[status]) return knownLabels[status];
  const normalized = status.replace(/_/g, ' ').toLocaleLowerCase('pt-BR');
  return normalized.charAt(0).toLocaleUpperCase('pt-BR') + normalized.slice(1);
}

/** Cor (palette MUI) para uma situacao/status conhecido. */
export function statusColor(
  status?: string | null,
): 'default' | 'success' | 'warning' | 'error' | 'info' {
  switch (status) {
    case 'ATIVO':
    case 'CONFIRMADA':
    case 'EMITIDA':
    case 'PAGA':
    case 'RECEBIDA':
    case 'FECHADO':
    case 'AUTORIZADA':
    case 'CONCLUIDA':
    case 'APROVADA':
    case 'REGULAR':
      return 'success';
    case 'PENDENTE':
    case 'PARCIAL':
    case 'PARCIALMENTE_RECEBIDA':
    case 'ABERTO':
    case 'RASCUNHO':
    case 'EM_EXECUCAO':
      return 'warning';
    case 'CANCELADA':
    case 'CANCELADO':
    case 'RECUSADA':
    case 'REJEITADA':
    case 'VENCIDO':
    case 'INATIVO':
      return 'error';
    case 'SUSPENSO':
    case 'PUBLICADO':
      return 'info';
    default:
      return 'default';
  }
}
