export const MICRO = 1_000_000n;
export const DECIMAL_STEP = 0.000001;
const ESCALA = 6;

/** Recebe um decimal não negativo já validado, com ponto como separador. */
export function asMicros(raw: string): bigint {
  const [whole, fraction = ''] = raw.split('.');
  return BigInt(whole) * MICRO + BigInt(fraction.slice(0, ESCALA).padEnd(ESCALA, '0'));
}

export function exactDecimal(value: unknown, label: string, positiveOnly = false): number {
  const raw = value === '' || value == null ? '0' : String(value).trim();
  const match = /^(\d+)(?:\.(\d+))?$/.exec(raw);
  if (!match || /[1-9]/.test((match[2] ?? '').slice(ESCALA))) {
    throw new Error(`${label}: informe valor não negativo com até seis casas decimais.`);
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || (positiveOnly && parsed <= 0)) throw new Error(`${label} deve ser positivo.`);
  if (!/^\d+(\.\d+)?$/.test(String(parsed)) || asMicros(String(parsed)) !== asMicros(raw)) {
    throw new Error(`${label}: o valor é grande demais para preservar todos os dígitos.`);
  }
  return parsed;
}
