import { describe, expect, it } from 'vitest';
import { stockInvalidationKey, stockQueryKey } from './StockPage';

describe('StockPage V54', () => {
  it('particiona todas as consultas pela organizacao ativa', () => {
    expect(stockQueryKey(10, 'positions', { produtoId: 1 })).toEqual([
      'tenant', 10, 'stock', 'positions', { produtoId: 1 },
    ]);
    expect(stockQueryKey(20, 'positions', { produtoId: 1 })).not.toEqual(
      stockQueryKey(10, 'positions', { produtoId: 1 }),
    );
  });

  it('invalida a raiz de estoque para atualizar locais e consultas', () => {
    expect(stockInvalidationKey(10)).toEqual(['tenant', 10, 'stock']);
  });

});
