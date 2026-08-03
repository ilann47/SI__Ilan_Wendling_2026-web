import { describe, expect, it } from 'vitest';
import { parseSpacesText } from './spaceImport';

describe('parseSpacesText', () => {
  it('converte linhas operacionais no contrato batch do backend', () => {
    expect(parseSpacesText('A-01;COMUM;nao;Coberta\nA-02;PCD;sim;Proxima ao portao'))
      .toEqual([
        { code: 'A-01', type: 'COMUM', accessible: false, position: 'Coberta' },
        { code: 'A-02', type: 'PCD', accessible: true, position: 'Proxima ao portao' },
      ]);
  });

  it('rejeita categoria fora do catalogo', () => {
    expect(() => parseSpacesText('A-01;INVALIDA;nao;')).toThrow('Linha 1');
  });
});
