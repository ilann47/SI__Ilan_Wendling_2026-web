import { describe, expect, it } from 'vitest';
import { buildServiceOrderPayload } from './serviceOrders';

describe('buildServiceOrderPayload', () => {
  it('normaliza a ordem e seus itens', () => {
    expect(buildServiceOrderPayload({ numero: ' os-1 ', clienteId: '3', moeda: 'brl',
      valorDesconto: '', itens: [{ servicoId: '8', quantidade: '2',
        valorUnitario: '50', valorDesconto: '' }] })).toEqual({
      numero: 'OS-1', clienteId: 3, moeda: 'BRL', valorDesconto: 0,
      itens: [{ servicoId: 8, quantidade: 2, valorUnitario: 50, valorDesconto: 0 }],
    });
  });

  it('exige ao menos um servico', () => {
    expect(() => buildServiceOrderPayload({ numero: 'OS-1', clienteId: 3, itens: [] }))
      .toThrow('Inclua ao menos um servico.');
  });
});
