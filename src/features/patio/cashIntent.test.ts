import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cashIntentStorageKey, clearCashIntent, readCashIntent, saveCashIntent } from './cashIntent';

describe('intenção durável do caixa', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());
  it('isola organização, operador e turno e preserva apenas dados validados', () => {
    const key = cashIntentStorageKey(2, 'caixa', 4);
    const intent = { chave: crypto.randomUUID(), tipo: 'SUPRIMENTO' as const, valor: '20.123456', motivo: 'Troco recebido do responsável' };
    saveCashIntent(key, intent);
    expect(readCashIntent(key)).toEqual({ intent, error: null });
    expect(readCashIntent(cashIntentStorageKey(3, 'caixa', 4)).intent).toBeNull();
    expect(readCashIntent(cashIntentStorageKey(2, 'outro', 4)).intent).toBeNull();
    expect(readCashIntent(cashIntentStorageKey(2, 'caixa', 5)).intent).toBeNull();
    clearCashIntent(key);
    expect(readCashIntent(key).intent).toBeNull();
  });
  it.each(['{', '{"chave":"nao-uuid"}', '{"chave":"13be614c-5461-4f02-8281-2d4eeaa39e98","tipo":"SUPRIMENTO","valor":"-1","motivo":"Motivo registrado"}'])('bloqueia armazenamento inválido sem criar intenção (%s)', (raw) => {
    localStorage.setItem('key', raw);
    expect(readCashIntent('key').intent).toBeNull();
    expect(readCashIntent('key').error).toMatch(/bloqueados/);
  });
  it('falha antes do envio se não puder guardar a chave durável', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    expect(() => saveCashIntent('key', { chave: crypto.randomUUID(), tipo: 'SANGRIA', valor: '1', motivo: 'Dinheiro retirado pelo gestor' })).toThrow(/Nenhum envio foi realizado/);
  });
  it('permite repetir somente a mesma chave e o mesmo payload já pendentes', () => {
    const original = { chave: crypto.randomUUID(), tipo: 'SUPRIMENTO' as const, valor: '20', motivo: 'Troco recebido do responsável' };
    saveCashIntent('key', original);
    expect(() => saveCashIntent('key', { ...original })).not.toThrow();
    expect(readCashIntent('key').intent).toEqual(original);
    expect(() => saveCashIntent('key', { ...original, valor: '30' })).toThrow(/Recarregue/);
    expect(readCashIntent('key').intent).toEqual(original);
  });
  it('não sobrescreve intenção que outra aba salvou enquanto a tela estava desatualizada', () => {
    const previous = { chave: crypto.randomUUID(), tipo: 'SUPRIMENTO' as const, valor: '20', motivo: 'Troco recebido do responsável' };
    saveCashIntent('key', previous);
    const stored = localStorage.getItem('key');
    expect(() => saveCashIntent('key', { ...previous, chave: crypto.randomUUID(), tipo: 'SANGRIA' })).toThrow(/Recarregue/);
    expect(localStorage.getItem('key')).toBe(stored);
    expect(readCashIntent('key').intent).toEqual(previous);
  });
});
