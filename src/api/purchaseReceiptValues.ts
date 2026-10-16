import type { PurchaseOrder, PurchaseReceipt } from './purchases';

const cents = (value: number) => Math.round((value + Number.EPSILON) * 100);

/** Sugestão editável da nota: diferenças dos acumulados preservam os centavos entre entregas. */
export function purchaseReceiptValues(order: PurchaseOrder, receipt: PurchaseReceipt, receipts: PurchaseReceipt[]) {
  const previous = receipts.filter((r) => r.id < receipt.id);
  const quantityBefore = (itemId: number) => previous.reduce((sum, r) => sum + r.itens
    .filter((item) => item.itemOrdemCompraId === itemId).reduce((n, item) => n + item.quantidade, 0), 0);
  const discountedValue = (itemId: number, quantity: number) => {
    const line = order.itens.find((item) => item.id === itemId);
    if (!line || line.quantidadePedida <= 0) throw new Error('Não foi possível recuperar o item original da compra. Reabra o recebimento.');
    const discount = Math.round(cents(line.valorDesconto) * quantity / line.quantidadePedida);
    return { discount, net: cents(quantity * line.valorUnitario) - discount, unit: line.valorUnitario };
  };
  const itens = receipt.itens.map((item) => {
    const before = quantityBefore(item.itemOrdemCompraId);
    const original = discountedValue(item.itemOrdemCompraId, before);
    const cumulative = discountedValue(item.itemOrdemCompraId, before + item.quantidade);
    return { produtoId: item.produtoId, produtoNome: item.produtoNome,
      quantidade: item.quantidade, valorUnitario: cumulative.unit,
      valorDesconto: (cumulative.discount - original.discount) / 100 };
  });
  const netBefore = order.itens.reduce((sum, item) => sum + discountedValue(item.id, quantityBefore(item.id)).net, 0);
  const receiptNet = itens.reduce((sum, item) => sum + cents(item.quantidade * item.valorUnitario) - cents(item.valorDesconto), 0);
  const base = cents(order.subtotal);
  // Sem base comercial positiva, não inventamos um rateio. Valores permanecem para conferência manual.
  const distribute = (total: number) => base > 0
    ? (Math.round(cents(total) * (netBefore + receiptNet) / base) - Math.round(cents(total) * netBefore / base)) / 100
    : 0;
  return { itens, valorFrete: distribute(order.valorFrete), valorDesconto: distribute(order.valorDesconto) };
}
