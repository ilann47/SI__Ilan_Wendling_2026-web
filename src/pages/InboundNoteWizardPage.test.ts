import { describe, expect, it } from 'vitest';
import { buildNotaEntradaPayload, itemSubtotal } from '../api/inboundNotes';
import { inboundNoteFormValues } from './InboundNoteEditorPage';
import type { NotaEntradaResponse } from '../types';
const body = { numero: 'N1', fornecedorId: 1, localEstoqueId: 3, itens: [{ produtoId: 2, quantidade: 1, valorUnitario: 10 }] };
describe('contrato do formulário de Nota', () => {
  it('envia quantidade, dinheiro e percentual com a sexta casa e conserva os identificadores', () => {
    const payload = buildNotaEntradaPayload({ ...body, numero: '000120', serie: '00A', modelo: '055',
      valorFrete: '0.000001', itens: [{ produtoId: 2, quantidade: '1.000001',
        valorUnitario: '10.000001', percentualDesconto: '0.000001' }] });
    expect(payload).toMatchObject({ numero: '000120', serie: '00A', modelo: '055', valorFrete: 0.000001,
      itens: [{ quantidade: 1.000001, valorUnitario: 10.000001, percentualDesconto: 0.000001 }] });
    expect(() => buildNotaEntradaPayload({ ...body, valorFrete: '9999999999999.000001' })).toThrow('grande demais');
  });
  it('recusa perda de precisão monetária e de quantidade antes do envio', () => {
    expect(() => buildNotaEntradaPayload({ ...body, valorFrete: '1.0000001' })).toThrow('seis casas');
    expect(() => buildNotaEntradaPayload({ ...body, itens: [{ produtoId: 2, quantidade: '0.0000001', valorUnitario: 10 }] })).toThrow('seis casas');
    expect(itemSubtotal({ quantidade: 0.333, valorUnitario: 0.05 })).toBe(0.01665);
  });
  it('preserva a composição própria da nota sem metadados de persistência', () => {
    const values = inboundNoteFormValues({ ...body, id: 9, version: 2, situacao: 'PENDENTE', itens: [{ id: 1, produtoId: 2, quantidade: 1, valorUnitario: 10, valorDesconto: 0, unidadeMedida: 'UN' }] } as unknown as NotaEntradaResponse);
    const payload = buildNotaEntradaPayload(values);
    expect(payload).not.toHaveProperty('version');
    expect(payload.itens[0]).not.toHaveProperty('unidadeMedida');
  });
  it('não envia metadados estranhos ao documento novo', () => {
    const payload = buildNotaEntradaPayload({ ...body, transportadoraId: 4, observacaoInterna: 'Conferir lote', organizacaoId: 99 });
    expect(payload).toMatchObject({ transportadoraId: 4, observacaoInterna: 'Conferir lote' });
    expect(payload).not.toHaveProperty('organizacaoId');
  });
  it('não reenvia percentual informativo arredondado ao editar desconto monetário', () => {
    const values = inboundNoteFormValues({ ...body, id: 9, version: 2, itens: [{ produtoId: 2, quantidade: 1, valorUnitario: 10000, valorDesconto: 10.01, percentualDesconto: 0.1 }] } as unknown as NotaEntradaResponse);
    expect(buildNotaEntradaPayload(values).itens[0]).toMatchObject({ valorDesconto: 10.01 });
    expect(buildNotaEntradaPayload(values).itens[0]).not.toHaveProperty('percentualDesconto');
  });
});
