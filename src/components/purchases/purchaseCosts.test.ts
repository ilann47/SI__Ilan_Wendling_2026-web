import { describe, expect, it } from 'vitest';
import { calculatePurchaseCosts } from './purchaseCosts';

describe('calculatePurchaseCosts', () => {
  it('rateia despesas pelos valores líquidos e fecha os centavos no último item', () => {
    expect(calculatePurchaseCosts([
      { quantidade: 2, valorUnitario: 100, valorDesconto: 10 },
      { quantidade: 1, valorUnitario: 100, valorDesconto: 0 },
    ], { valorFrete: 29, valorSeguro: 14.5, outrasDespesas: 5.8 }))
      .toEqual({
        quantidadeTotal: 3,
        valorProdutosBruto: 300,
        descontoItens: 10,
        subtotalProdutos: 290,
        valorFrete: 29,
        valorSeguro: 14.5,
        outrasDespesas: 5.8,
        valorTotal: 339.3,
        itens: [
          { valorBruto: 200, valorTotal: 190, rateioFrete: 19, rateioSeguro: 9.5,
            rateioOutrasDespesas: 3.8, custoTotal: 222.3, custoUnitarioFinal: 111.15 },
          { valorBruto: 100, valorTotal: 100, rateioFrete: 10, rateioSeguro: 5,
            rateioOutrasDespesas: 2, custoTotal: 117, custoUnitarioFinal: 117 },
        ],
      });
  });
});
