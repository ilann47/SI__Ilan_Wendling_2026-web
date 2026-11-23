import { afterEach, describe, expect, it } from 'vitest';
import { clearSettlementAttempt, persistSettlementAttempt, readSettlementAttempt, settlementAttemptStorageKey } from './financialSettlementAttempt';

afterEach(() => sessionStorage.clear());
describe('tentativa de baixa', () => {
  it('preserva a chave e os dados após recriar a leitura', () => {
    const key = settlementAttemptStorageKey(7, 'operador', 'receber', 42);
    const attempt = { key: 'pedido-unico', body: { valor: 60, data: '2030-01-01' } };
    persistSettlementAttempt(key, attempt);
    expect(readSettlementAttempt(key)).toEqual(attempt);
    clearSettlementAttempt(key);
    expect(readSettlementAttempt(key)).toBeNull();
  });
  it('separa organização, usuário, operação e título', () => {
    const keys = [settlementAttemptStorageKey(7, 'a', 'pagar', 1), settlementAttemptStorageKey(8, 'a', 'pagar', 1),
      settlementAttemptStorageKey(7, 'b', 'pagar', 1), settlementAttemptStorageKey(7, 'a', 'receber', 1),
      settlementAttemptStorageKey(7, 'a', 'pagar', 2)];
    expect(new Set(keys).size).toBe(5);
  });
});
