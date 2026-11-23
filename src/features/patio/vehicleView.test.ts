import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readVehicleView, vehicleViewStorageKey, writeVehicleView } from './vehicleView';

describe('preferência visual dos veículos do pátio', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());
  it('mantém cartões como padrão e ignora valores inválidos', () => {
    expect(readVehicleView(2, 'caixa')).toBe('cards');
    localStorage.setItem(vehicleViewStorageKey(2, 'caixa'), 'modo-inválido');
    expect(readVehicleView(2, 'caixa')).toBe('cards');
  });
  it('isola por organização e login e restaura o modo escolhido', () => {
    writeVehicleView(2, 'caixa', 'list');
    expect(readVehicleView(2, 'caixa')).toBe('list');
    expect(readVehicleView(3, 'caixa')).toBe('cards');
    expect(readVehicleView(2, 'gestor')).toBe('cards');
    writeVehicleView(2, 'caixa', 'cards');
    expect(readVehicleView(2, 'caixa')).toBe('cards');
  });
  it('não bloqueia o pátio se o armazenamento estiver indisponível', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('bloqueado'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('bloqueado'); });
    expect(readVehicleView(2, 'caixa')).toBe('cards');
    expect(() => writeVehicleView(2, 'caixa', 'list')).not.toThrow();
  });
});
