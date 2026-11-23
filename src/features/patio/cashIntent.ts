import { decimalInput } from './operation';

export type CashIntent = { chave: string; tipo: 'SUPRIMENTO' | 'SANGRIA'; valor: string; motivo: string };
export const cashIntentStorageKey = (org: number, operator: string, turn: number) =>
  `yes7parking.patio.cash-intent.${org}.${encodeURIComponent(operator)}.${turn}`;

function validIntent(value: unknown): value is CashIntent {
  if (!value || typeof value !== 'object') return false;
  const intent = value as Partial<CashIntent>;
  return typeof intent.chave === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(intent.chave)
    && (intent.tipo === 'SUPRIMENTO' || intent.tipo === 'SANGRIA')
    && typeof intent.valor === 'string' && decimalInput(intent.valor) === intent.valor && /[1-9]/.test(intent.valor)
    && typeof intent.motivo === 'string' && intent.motivo === intent.motivo.trim()
    && intent.motivo.length >= 10 && intent.motivo.length <= 300;
}

export function readCashIntent(key: string): { intent: CashIntent | null; error: string | null } {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return { intent: null, error: null };
    const parsed: unknown = JSON.parse(raw);
    if (!validIntent(parsed)) throw new Error('invalid');
    return { intent: { chave: parsed.chave, tipo: parsed.tipo, valor: parsed.valor, motivo: parsed.motivo }, error: null };
  } catch {
    return { intent: null, error: 'Não foi possível validar a intenção local do caixa. Novos movimentos estão bloqueados. Confira o histórico com um responsável antes de limpar o armazenamento.' };
  }
}

export function saveCashIntent(key: string, intent: CashIntent) {
  if (!validIntent(intent)) throw new Error('A intenção do movimento é inválida. Nenhum envio foi realizado.');
  const existing = readCashIntent(key);
  if (existing.error) throw new Error(existing.error + ' Nenhum envio foi realizado.');
  const current = existing.intent;
  if (current && (current.chave !== intent.chave || current.tipo !== intent.tipo
    || current.valor !== intent.valor || current.motivo !== intent.motivo)) {
    throw new Error('Há outra intenção de movimento pendente neste navegador. Recarregue a tela e retome o movimento já salvo. Nenhum envio foi realizado.');
  }
  try {
    localStorage.setItem(key, JSON.stringify(intent));
    if (localStorage.getItem(key) !== JSON.stringify(intent)) throw new Error('not persisted');
  } catch {
    throw new Error('Não foi possível guardar a intenção com segurança neste navegador. Nenhum envio foi realizado. Habilite o armazenamento antes de movimentar o caixa.');
  }
}

export function clearCashIntent(key: string) {
  try { localStorage.removeItem(key); } catch { /* A chave antiga continuará reconciliável, nunca será reenviada automaticamente. */ }
}
