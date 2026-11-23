import { describe, expect, it } from 'vitest';
import { isOperationalNavigationPath } from './operationalNavigation';

describe('navegação operacional sem catálogo técnico', () => {
  it('oculta diagnósticos inclusive caminhos salvos e não remove bloqueio de veículos/vagas', () => {
    expect(isOperationalNavigationPath('/app/bloqueios')).toBe(false);
    expect(isOperationalNavigationPath('/app/bloqueios?tipo=dependencia')).toBe(false);
    expect(isOperationalNavigationPath('/app/bloqueios/4')).toBe(false);
    expect(isOperationalNavigationPath('/app/veiculos')).toBe(true);
    expect(isOperationalNavigationPath('/app/instalacoes?tab=vagas')).toBe(true);
    expect(isOperationalNavigationPath('/app/acesso-eventos')).toBe(true);
  });
});
