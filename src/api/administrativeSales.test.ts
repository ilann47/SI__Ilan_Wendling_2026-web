import { describe, expect, it } from 'vitest';
import { buildAdministrativeSalePayload, buildSaleOutboundNotePayload } from './administrativeSales';

describe('buildAdministrativeSalePayload', () => {
  it('normaliza venda e itens', () => {
    expect(buildAdministrativeSalePayload({
      numero: ' venda-1 ', clienteId: '2', localEstoqueId: 3, moeda: 'brl',
      valorDesconto: '', itens: [{ produtoId: 4, quantidade: '2', valorUnitario: '10' }],
    })).toMatchObject({ numero: 'VENDA-1', clienteId: 2, localEstoqueId: 3,
      moeda: 'BRL', valorDesconto: 0,
      itens: [{ produtoId: 4, quantidade: 2, valorUnitario: 10, valorDesconto: 0 }] });
  });
  it('recusa venda sem itens', () => {
    expect(() => buildAdministrativeSalePayload({ numero: 'V1', clienteId: 1,
      localEstoqueId: 1, itens: [] })).toThrow('Inclua ao menos um item');
  });
});

describe('dados adicionais da nota de saída', () => {
  it('não inventa valores fiscais nem replica dados comerciais no payload', () => {
    expect(buildSaleOutboundNotePayload({ numero: ' N-12 ', modelo: '', serie: '', clienteId: 999, itens: [] }))
      .toEqual({ numero: 'N-12' });
  });
  it('conserva série, modelo e datas informados pelo usuário', () => {
    expect(buildSaleOutboundNotePayload({ numero: 'N-12', modelo: '55', serie: '001', dataEmissao: '2026-09-12' }))
      .toEqual({ numero: 'N-12', modelo: '55', serie: '001', dataEmissao: '2026-09-12' });
  });
  it.each(['', ' '.repeat(3), 'N'.repeat(21)])('valida número %s', (numero) => {
    expect(() => buildSaleOutboundNotePayload({ numero })).toThrow('Informe o número');
  });
});
