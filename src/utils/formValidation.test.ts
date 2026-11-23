import { describe, expect, it } from 'vitest';
import { MAX_INT32, requiredTextError, wholeNumber } from './formValidation';

describe('validação de cadastros operacionais', () => {
  it.each(['', ' ', '-1', '1.5', '1.0', '1e3', '2147483648'])('não converte quantidade inválida %j', (value) => {
    expect(wholeNumber(value, 0)).toBeNull();
  });
  it('aceita zero só quando permitido e respeita o teto recebido do pátio', () => {
    expect(wholeNumber('0', 0)).toBe(0);
    expect(wholeNumber('0', 1)).toBeNull();
    expect(wholeNumber('35', 1, 35)).toBe(35);
    expect(wholeNumber('36', 1, 35)).toBeNull();
    expect(wholeNumber(String(MAX_INT32), 1)).toBe(MAX_INT32);
  });
  it('distingue texto obrigatório de texto excessivo sem bloquear acentos', () => {
    expect(requiredTextError('   ', 'o nome', 120)).toBe('Informe o nome.');
    expect(requiredTextError('a'.repeat(121), 'o nome', 120)).toBe('Use até 120 caracteres.');
    expect(requiredTextError('Pátio São José', 'o nome', 120)).toBeUndefined();
  });
});
