import { describe, expect, it } from 'vitest';
import { calculateInboundNoteCosts } from './inboundNoteCosts';
import { asMicros } from '../../utils/fixedDecimal';

describe('calculateInboundNoteCosts', () => {
  it('rateia despesas pelos valores líquidos e preserva o total', () => {
    expect(calculateInboundNoteCosts([
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
  it('não cria rateio negativo quando o resíduo excede o último item', () => {
    const value = calculateInboundNoteCosts(Array.from({ length: 4 }, () => ({ quantidade: 1, valorUnitario: 1 })), { valorFrete: 0.02 });
    expect(value.itens.every((item) => item.rateioFrete >= 0)).toBe(true);
    expect(value.itens.reduce((sum, item) => sum + asMicros(String(item.rateioFrete)), 0n)).toBe(20_000n);
  });

  it('preserva a sexta casa e distribui o resíduo indivisível em ordem estável', () => {
    const value = calculateInboundNoteCosts([
      { quantidade: 1.000001, valorUnitario: 1 },
      { quantidade: 1.000001, valorUnitario: 1 },
    ], { valorFrete: 0.000001 });
    expect(value.quantidadeTotal).toBe(2.000002);
    expect(value.subtotalProdutos).toBe(2.000002);
    expect(value.valorTotal).toBe(2.000003);
    expect(value.itens.map((item) => item.rateioFrete)).toEqual([0.000001, 0]);
    expect(value.itens[0].custoUnitarioFinal).toBe(1.000001);
  });

});
