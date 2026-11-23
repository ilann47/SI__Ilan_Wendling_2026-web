import { describe, expect, it } from 'vitest';
import { previewNewCharge } from './chargePreview';

describe('Prévia da nova cobrança em centavos', () => {
  it.each([
    ['120', '120.000000', '0.000000'],
    ['25,123456', '25.120000', '-0.003456'],
    ['25.125000', '25.130000', '0.005000'],
    ['0.005', '0.010000', '0.005000'],
    ['99999999.999999', '100000000.000000', '0.000001'],
  ])('mantém seis casas e HALF_UP exato em %s', (value, due, adjustment) => {
    expect(previewNewCharge(value)).toMatchObject({ due, adjustment });
  });
  it.each(['', '-1', '1e2', '0.004999', '0', '10.0000001', 'texto'])('rejeita inválido ou cobrança zero: %s', (value) => {
    expect(previewNewCharge(value)).toBeNull();
  });
});
