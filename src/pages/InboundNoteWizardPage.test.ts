import { describe, expect, it } from 'vitest';
import { type WizardState, validateInboundNoteStep } from './InboundNoteWizardPage';

function validState(): WizardState {
  return {
    origin: 'manual', ordemCompraId: null, recebimentoCompraId: null,
    numero: '55', serie: '1', modelo: '55', tipoFrete: 'CIF',
    dataEmissao: '2026-09-28', dataChegada: '2026-09-28', fornecedorId: 1,
    observacao: '', itens: [{ produtoId: 2, quantidade: 2, valorUnitario: 10, valorDesconto: 1 }],
    valorFrete: 2, valorSeguro: 1, outrasDespesas: 1, valorDesconto: 0,
    localEstoqueId: 3, condicaoPagamentoId: null,
  };
}

describe('validateInboundNoteStep', () => {
  it('rejeita chegada anterior à emissão', () => {
    const state = { ...validState(), dataChegada: '2026-09-27' };
    expect(validateInboundNoteStep(state, 1)).toBe('A data de chegada não pode ser anterior à emissão.');
  });

  it('rejeita valor unitário negativo e desconto superior ao item', () => {
    const negative = { ...validState(), itens: [{ produtoId: 2, quantidade: 1, valorUnitario: -1, valorDesconto: 0 }] };
    expect(validateInboundNoteStep(negative, 2)).toBe('O valor unitário dos itens não pode ser negativo.');

    const excessive = { ...validState(), itens: [{ produtoId: 2, quantidade: 1, valorUnitario: 10, valorDesconto: 11 }] };
    expect(validateInboundNoteStep(excessive, 2)).toBe('O desconto de cada item deve estar entre zero e o valor bruto do item.');
  });

  it('rejeita custos negativos e desconto superior ao total da entrada', () => {
    expect(validateInboundNoteStep({ ...validState(), valorFrete: -1 }, 3))
      .toBe('Frete, seguro, outras despesas e desconto não podem ser negativos.');
    expect(validateInboundNoteStep({ ...validState(), valorDesconto: 30 }, 3))
      .toBe('O desconto da nota não pode exceder o valor da entrada.');
  });
});
