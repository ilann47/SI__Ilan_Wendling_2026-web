import { describe, expect, it } from 'vitest';
import { canAdjustStock, stockInvalidationKey, stockQueryKey } from './StockPage';

describe('StockPage V54', () => {
  it('particiona todas as consultas pela organizacao ativa', () => {
    expect(stockQueryKey(10, 'positions', { produtoId: 1 })).toEqual([
      'tenant', 10, 'stock', 'positions', { produtoId: 1 },
    ]);
    expect(stockQueryKey(20, 'positions', { produtoId: 1 })).not.toEqual(
      stockQueryKey(10, 'positions', { produtoId: 1 }),
    );
  });

  it('invalida a raiz de estoque para atualizar locais e opcoes do ajuste', () => {
    expect(stockInvalidationKey(10)).toEqual(['tenant', 10, 'stock']);
  });

  it('exige stock:manage e catalog:read cumulativamente para ajustar', () => {
    expect(canAdjustStock(['stock:manage'])).toBe(false);
    expect(canAdjustStock(['catalog:read'])).toBe(false);
    expect(canAdjustStock(['stock:manage', 'catalog:read'])).toBe(true);
  });
});
