// Orientação para a configuração. A cobrança confirmada sempre vem da API.
export function previewNewCharge(value: string): { due: string; adjustment: string } | null {
  if (!/^\d{1,8}(?:[.,]\d{1,6})?$/.test(value)) return null;
  const [integer, fraction = ''] = value.replace(',', '.').split('.');
  const micros = BigInt(integer) * 1_000_000n + BigInt(fraction.padEnd(6, '0'));
  const due = ((micros + 5_000n) / 10_000n) * 10_000n;
  if (due === 0n) return null;
  const decimal = (amount: bigint) => {
    const absolute = amount < 0n ? -amount : amount;
    return `${amount < 0n ? '-' : ''}${absolute / 1_000_000n}.${String(absolute % 1_000_000n).padStart(6, '0')}`;
  };
  return { due: decimal(due), adjustment: decimal(due - micros) };
}
