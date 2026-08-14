import { describe, expect, it } from 'vitest';
import { buildAdministrativeSalePayload } from './administrativeSales';

describe('buildAdministrativeSalePayload', () => {
  it('normaliza venda e itens', () => {
    expect(buildAdministrativeSalePayload({
      numero: ' venda-1 ', clienteId: '2', localEstoqueId: 3, moeda: 'brl',
      valorDesconto: '', itens: [{ produtoId: 4, quantidade: '2', valorUnitario: '10' }],
    })).toMatchObject({ numero: 'VENDA-1', clienteId: 2, localEstoqueId: 3,
      moeda: 'BRL', valorDesconto: 0,
      itens: [{ produtoId: 4, quantidade: 2, valorUnitario: 10, valorDesconto: 0 }] });
  });
  it('recusa venda sem itens', () => {
    expect(() => buildAdministrativeSalePayload({ numero: 'V1', clienteId: 1,
      localEstoqueId: 1, itens: [] })).toThrow('Inclua ao menos um item');
  });
});
