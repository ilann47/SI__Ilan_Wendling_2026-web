import { describe, expect, it } from 'vitest';
import { cashChange, contextStorageKey, decimalInput, isValidPatioPlate, normalizePatioPlate, readContext, writeContext } from './operation';

describe('operação do caixa', () => {
  it('mantém referências livres e só remove o hífen da placa brasileira completa', () => {
    expect(normalizePatioPlate(' abc-1d23 ')).toBe('ABC1D23');
    expect(normalizePatioPlate(' hbf593 ')).toBe('HBF593');
    expect(normalizePatioPlate('a-1 %_')).toBe('A-1 %_');
    expect(isValidPatioPlate('1')).toBe(true);
    expect(isValidPatioPlate('0123456789')).toBe(true);
    expect(isValidPatioPlate('01234567890')).toBe(false);
    expect(isValidPatioPlate('   ')).toBe(false);
    expect(isValidPatioPlate('A\nB')).toBe(false);
  });
  it('valida e calcula troco exato com seis casas, sem aceitar valor insuficiente', () => {
    expect(cashChange('30,123457', '25.123456')).toBe('5.000001');
    expect(cashChange('24.999999', '25')).toBeNull();
    expect(decimalInput('-1')).toBeNull();
    expect(decimalInput('1.1234567')).toBeNull();
    expect(cashChange('', '25')).toBeNull();
  });
  it('isola contexto por organização e operador e rejeita cache inválido', () => {
    localStorage.clear();
    const context = { patioId: 7, patioNome: 'Norte', eventoId: 4, eventoNome: 'Festival' };
    writeContext(2, 'caixa', context);
    expect(readContext(2, 'caixa')).toEqual(context);
    expect(readContext(3, 'caixa')).toBeNull();
    expect(readContext(2, 'outro')).toBeNull();
    localStorage.setItem(contextStorageKey(2, 'caixa'), '{"patioId":-1}');
    expect(readContext(2, 'caixa')).toBeNull();
  });
});
