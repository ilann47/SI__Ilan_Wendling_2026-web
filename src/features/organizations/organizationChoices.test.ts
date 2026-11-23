import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_ORGANIZATION_FORM } from './organizationTypes';

afterEach(() => { vi.restoreAllMocks(); vi.resetModules(); });

describe('Opções do cadastro de organização', () => {
  it('mantém os padrões e códigos já usados, com estados e nomes legíveis', async () => {
    const { currencyChoices, regionChoices, planChoices, timeZoneChoices } = await import('./organizationChoices');
    expect(currencyChoices).toContainEqual({ value: DEFAULT_ORGANIZATION_FORM.currency, label: 'BRL — Real brasileiro' });
    expect(regionChoices).toHaveLength(27);
    expect(regionChoices).toContainEqual({ value: DEFAULT_ORGANIZATION_FORM.region, label: 'SP — São Paulo' });
    expect(planChoices.map(({ value }) => value)).toEqual(['STANDARD', 'ENTERPRISE']);
    expect(timeZoneChoices.find(({ value }) => value === DEFAULT_ORGANIZATION_FORM.timeZone)?.brazil).toBe(true);
    for (const choices of [currencyChoices, regionChoices, planChoices, timeZoneChoices]) {
      expect(new Set(choices.map(({ value }) => value)).size).toBe(choices.length);
    }
  });

  it('continua oferecendo opções em navegadores sem supportedValuesOf', async () => {
    vi.stubGlobal('Intl', { ...Intl, supportedValuesOf: undefined });
    try {
      vi.resetModules();
      const { currencyChoices, timeZoneChoices } = await import('./organizationChoices');
      expect(currencyChoices.map(({ value }) => value)).toEqual(['BRL', 'USD', 'EUR']);
      expect(timeZoneChoices.filter(({ brazil }) => brazil)).toHaveLength(16);
      expect(timeZoneChoices.some(({ value }) => value === 'UTC')).toBe(true);
    } finally { vi.unstubAllGlobals(); }
  });

  it('usa opções de segurança se a enumeração Intl falhar', async () => {
    vi.stubGlobal('Intl', { ...Intl, supportedValuesOf: () => { throw new Error('indisponível'); } });
    try {
      vi.resetModules();
      const { currencyChoices, timeZoneChoices } = await import('./organizationChoices');
      expect(currencyChoices[0].value).toBe('BRL');
      expect(timeZoneChoices.some(({ value }) => value === 'America/Sao_Paulo')).toBe(true);
    } finally { vi.unstubAllGlobals(); }
  });
});
