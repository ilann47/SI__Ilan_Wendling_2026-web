import { asMicros, exactDecimal, MICRO } from '../../utils/fixedDecimal';

export interface InboundNoteCostRowInput {
  quantidade?: unknown;
  valorUnitario?: unknown;
  valorDesconto?: unknown;
}

export interface InboundNoteExpensesInput {
  valorFrete?: unknown;
  valorSeguro?: unknown;
  outrasDespesas?: unknown;
}

const micros = (value: unknown) => {
  try {
    return asMicros(String(exactDecimal(value, 'Valor')));
  } catch {
    // Formulários ainda em preenchimento podem conter campos inválidos.
    return 0n;
  }
};
const toDecimal = (value: bigint) => Number(value) / Number(MICRO);
const add = (a: bigint, b: bigint) => a + b;
const divideHalfUp = (value: bigint, denominator: bigint) => (value + denominator / 2n) / denominator;

function allocate(total: bigint, weights: bigint[]): bigint[] {
  if (total === 0n || weights.length === 0) return weights.map(() => 0n);
  const sum = weights.reduce(add, 0n);
  const base = sum || BigInt(weights.length);
  const raw = weights.map((weight) => total * (sum > 0n ? weight : 1n));
  const allocated = raw.map((value) => value / base);
  const order = raw.map((value, index) => ({ index, remainder: value % base }))
    .sort((a, b) => a.remainder === b.remainder ? a.index - b.index : a.remainder > b.remainder ? -1 : 1);
  const remaining = Number(total - allocated.reduce(add, 0n));
  for (let index = 0; index < remaining; index++) allocated[order[index].index]++;
  return allocated;
}

export function calculateInboundNoteCosts(
  rows: InboundNoteCostRowInput[] = [],
  expenses: InboundNoteExpensesInput = {},
) {
  const basicRows = rows.map((row) => {
    const quantidade = micros(row.quantidade);
    const valorBruto = divideHalfUp(quantidade * micros(row.valorUnitario), MICRO);
    const descontoInformado = micros(row.valorDesconto);
    const valorDesconto = descontoInformado > valorBruto ? valorBruto : descontoInformado;
    return { quantidade, valorBruto, valorTotal: valorBruto - valorDesconto };
  });
  const quantidadeTotal = basicRows.map((row) => row.quantidade).reduce(add, 0n);
  const valorProdutosBruto = basicRows.map((row) => row.valorBruto).reduce(add, 0n);
  const subtotalProdutos = basicRows.map((row) => row.valorTotal).reduce(add, 0n);
  const descontoItens = valorProdutosBruto - subtotalProdutos;
  const valorFrete = micros(expenses.valorFrete);
  const valorSeguro = micros(expenses.valorSeguro);
  const outrasDespesas = micros(expenses.outrasDespesas);
  const valueWeights = basicRows.map((row) => row.valorTotal);
  const weights = subtotalProdutos > 0n ? valueWeights : basicRows.map((row) => row.quantidade);
  const freight = allocate(valorFrete, weights);
  const insurance = allocate(valorSeguro, weights);
  const other = allocate(outrasDespesas, weights);

  const itens = basicRows.map((row, index) => {
    const custoTotal = row.valorTotal + freight[index] + insurance[index] + other[index];
    return {
      valorBruto: toDecimal(row.valorBruto),
      valorTotal: toDecimal(row.valorTotal),
      rateioFrete: toDecimal(freight[index]),
      rateioSeguro: toDecimal(insurance[index]),
      rateioOutrasDespesas: toDecimal(other[index]),
      custoTotal: toDecimal(custoTotal),
      custoUnitarioFinal: row.quantidade > 0n ? toDecimal(divideHalfUp(custoTotal * MICRO, row.quantidade)) : 0,
    };
  });

  return {
    quantidadeTotal: toDecimal(quantidadeTotal),
    valorProdutosBruto: toDecimal(valorProdutosBruto),
    descontoItens: toDecimal(descontoItens),
    subtotalProdutos: toDecimal(subtotalProdutos),
    valorFrete: toDecimal(valorFrete),
    valorSeguro: toDecimal(valorSeguro),
    outrasDespesas: toDecimal(outrasDespesas),
    valorTotal: toDecimal(subtotalProdutos + valorFrete + valorSeguro + outrasDespesas),
    itens,
  };
}
