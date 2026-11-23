import { describe, expect, it } from 'vitest';
import { fiscalPayerPayload } from './payer';

describe('identificação fiscal no estacionamento', () => {
  it('normaliza CPF, CNPJ numérico ou CNPJ alfanumérico válidos', () => {
    const nome = 'Prestação QA';
    expect(fiscalPayerPayload({ documento: '529.982.247-25', nome: '  Prestação QA ' }))
      .toEqual({ documento: '52998224725', nome });
    expect(fiscalPayerPayload({ documento: '54.728.376/0001-46', nome }))
      .toEqual({ documento: '54728376000146', nome });
    expect(fiscalPayerPayload({ documento: '12.abc.345/01de-35', nome }))
      .toEqual({ documento: '12ABC34501DE35', nome });
  });

  it('não transforma documentos incorretos em válidos ou aceita identificação parcial', () => {
    for (const documento of ['529.982.247-24', '12.ABC.345/01DE-36', '00000000000', '52998224725#', '']) {
      expect(fiscalPayerPayload({ documento, nome: 'Cliente QA' })).toBeNull();
    }
    expect(fiscalPayerPayload({ documento: '52998224725', nome: '  ' })).toBeNull();
    expect(fiscalPayerPayload({ documento: '52998224725', nome: 'x'.repeat(161) })).toBeNull();
  });
});
