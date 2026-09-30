import { describe, expect, it } from 'vitest';
import { buildServiceOrderNotePayload, buildServiceOrderPayload } from './serviceOrders';

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

describe('nota preparada pela ordem de serviço', () => {
  it('reutiliza cliente e valores no servidor, sem promovê-los a campos editáveis', () => {
    expect(buildServiceOrderNotePayload({ numero: ' NS-1 ', clienteId: 7, valorServico: 123, valorDesconto: 10 }))
      .toEqual({ numero: 'NS-1' });
  });
  it('envia somente referências de pagamento selecionadas e alíquota informada', () => {
    expect(buildServiceOrderNotePayload({ numero: 'NS-1', condicaoPagamentoId: '4', formaPagamentoId: '5', aliquotaIss: '2.5' }))
      .toEqual({ numero: 'NS-1', condicaoPagamentoId: 4, formaPagamentoId: 5, aliquotaIss: 2.5 });
  });
  it.each([-1, 101, 'abc'])('recusa alíquota inválida %s', (aliquotaIss) => {
    expect(() => buildServiceOrderNotePayload({ numero: 'NS-1', aliquotaIss })).toThrow('Alíquota ISS');
  });
});
