export interface PurchaseCostRowInput {
  quantidade?: unknown;
  valorUnitario?: unknown;
  valorDesconto?: unknown;
}

export interface PurchaseExpensesInput {
  valorFrete?: unknown;
  valorSeguro?: unknown;
  outrasDespesas?: unknown;
}

const number = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};
const cents = (value: number) => Math.round(value * 100);
const money = (value: number) => cents(value) / 100;

function allocate(total: number, weights: number[]): number[] {
  const totalCents = cents(total);
  const base = weights.reduce((sum, weight) => sum + weight, 0);
  if (totalCents === 0 || weights.length === 0) return weights.map(() => 0);
  let allocated = 0;
  return weights.map((weight, index) => {
    const value = index === weights.length - 1
      ? totalCents - allocated
      : Math.round(totalCents * (base > 0 ? weight / base : 1 / weights.length));
    allocated += value;
    return value / 100;
  });
}

export function calculatePurchaseCosts(
  rows: PurchaseCostRowInput[] = [],
  expenses: PurchaseExpensesInput = {},
) {
  const basicRows = rows.map((row) => {
    const quantidade = number(row.quantidade);
    const valorUnitario = number(row.valorUnitario);
    const valorBruto = money(quantidade * valorUnitario);
    const valorDesconto = Math.min(number(row.valorDesconto), valorBruto);
    return { quantidade, valorBruto, valorTotal: money(valorBruto - valorDesconto) };
  });
  const quantidadeTotal = basicRows.reduce((sum, row) => sum + row.quantidade, 0);
  const valorProdutosBruto = money(basicRows.reduce((sum, row) => sum + row.valorBruto, 0));
  const subtotalProdutos = money(basicRows.reduce((sum, row) => sum + row.valorTotal, 0));
  const descontoItens = money(valorProdutosBruto - subtotalProdutos);
  const valorFrete = money(number(expenses.valorFrete));
  const valorSeguro = money(number(expenses.valorSeguro));
  const outrasDespesas = money(number(expenses.outrasDespesas));
  const valueWeights = basicRows.map((row) => row.valorTotal);
  const weights = subtotalProdutos > 0 ? valueWeights : basicRows.map((row) => row.quantidade);
  const freight = allocate(valorFrete, weights);
  const insurance = allocate(valorSeguro, weights);
  const other = allocate(outrasDespesas, weights);

  const itens = basicRows.map((row, index) => {
    const custoTotal = money(row.valorTotal + freight[index] + insurance[index] + other[index]);
    return {
      valorBruto: row.valorBruto,
      valorTotal: row.valorTotal,
      rateioFrete: freight[index],
      rateioSeguro: insurance[index],
      rateioOutrasDespesas: other[index],
      custoTotal,
      custoUnitarioFinal: row.quantidade > 0 ? money(custoTotal / row.quantidade) : 0,
    };
  });

  return {
    quantidadeTotal,
    valorProdutosBruto,
    descontoItens,
    subtotalProdutos,
    valorFrete,
    valorSeguro,
    outrasDespesas,
    valorTotal: money(subtotalProdutos + valorFrete + valorSeguro + outrasDespesas),
    itens,
  };
}
