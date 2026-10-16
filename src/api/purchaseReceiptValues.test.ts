import { describe, expect, it } from 'vitest';
import type { PurchaseOrder, PurchaseReceipt } from './purchases';
import { purchaseReceiptValues } from './purchaseReceiptValues';

describe('rateio dos valores negociados por recebimento', () => {
  it('preserva centavos, desconto dos itens e despesas ao receber em três partes', () => {
    const order = { subtotal: 29.99, valorFrete: 0.01, valorDesconto: 0.02,
      itens: [{ id: 7, quantidadePedida: 3, valorUnitario: 10, valorDesconto: 0.01 }],
    } as PurchaseOrder;
    const receipts = [1, 2, 3].map((id) => ({ id, itens: [{ id, itemOrdemCompraId: 7,
      produtoId: 8, produtoNome: 'Produto', quantidade: 1, custoUnitario: 10 }] } as PurchaseReceipt));
    const values = receipts.map((r) => purchaseReceiptValues(order, r, [...receipts].reverse()));
    expect(values.map((v) => v.itens[0].valorDesconto)).toEqual([0, 0.01, 0]);
    expect(values.reduce((sum, v) => sum + v.valorFrete, 0)).toBeCloseTo(0.01);
    expect(values.reduce((sum, v) => sum + v.valorDesconto, 0)).toBeCloseTo(0.02);
    expect(values.every((v) => v.itens[0].valorUnitario === 10)).toBe(true);
  });
});
