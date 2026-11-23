import { describe, expect, it } from 'vitest';
import { organizationLanding } from './organizationLanding';

describe('destino após escolha explícita da organização', () => {
  it('leva caixa ao pátio sem redirecionar gestores', () => {
    expect(organizationLanding('/app', ['operations:checkout'])).toBe('/app/patio');
    expect(organizationLanding('/app', ['operations:checkout', 'operations:manage'])).toBe('/app');
  });
  it('preserva deep links permitidos e rejeita destinos externos ou indevidos', () => {
    expect(organizationLanding('/app/patio?placa=ABC#saida', ['operations:checkout'])).toBe('/app/patio?placa=ABC#saida');
    expect(organizationLanding('/app/administracao', ['operations:checkout'])).toBe('/app/patio');
    expect(organizationLanding('https://example.com', ['operations:checkout'])).toBe('/app/patio');
  });
});
