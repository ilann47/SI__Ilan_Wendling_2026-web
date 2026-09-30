import dayjs from 'dayjs';
import { describe, expect, it } from 'vitest';
import { financialRange, financialTitlePath } from './dashboardContext';

describe('contexto financeiro do resumo', () => {
  it('conta exatamente sete datas incluindo hoje e atravessa o mês', () => {
    expect(financialRange('week', dayjs('2026-09-29'))).toMatchObject({ inicio: '2026-09-29', fim: '2026-10-05' });
    expect(financialRange('today', dayjs('2026-09-29'))).toMatchObject({ inicio: '2026-09-29', fim: '2026-09-29' });
    expect(financialRange('month', dayjs('2028-02-12'))).toMatchObject({ inicio: '2028-02-01', fim: '2028-02-29' });
  });
  it.each([['CONTA_PAGAR', 'contas-pagar'], ['CONTA_RECEBER', 'contas-receber'], ['DESPESA_AVULSA', 'contas-pagar-avulsas']])('resolve %s sem confundir origens', (origem, path) => {
    expect(financialTitlePath({ origem, id: 23 })).toBe(`/app/${path}?detail=23`);
  });
  it('não inventa destino para origem desconhecida nem ID inválido', () => {
    expect(financialTitlePath({ origem: 'OUTRA', id: 1 })).toBeUndefined();
    expect(financialTitlePath({ origem: 'CONTA_PAGAR', id: -1 })).toBeUndefined();
  });
});
