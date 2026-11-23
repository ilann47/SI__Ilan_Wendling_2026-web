export const MAX_INT32 = 2_147_483_647;

export function wholeNumber(value: string, min: number, max = MAX_INT32): number | null {
  if (!/^\d+$/.test(value)) return null;
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= min && number <= max ? number : null;
}

export function requiredTextError(value: string, label: string, max: number): string | undefined {
  if (!value.trim()) return `Informe ${label}.`;
  if (value.length > max) return `Use até ${max} caracteres.`;
  return undefined;
}
