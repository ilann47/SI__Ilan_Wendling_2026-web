import { describe, expect, it } from 'vitest';
import type { PurchaseDocuments, PurchaseOrder } from '../../api/purchases';
import { purchaseProgressSteps } from './PurchaseProgress';

const order = (status: PurchaseOrder['status']): PurchaseOrder => ({
  id: 1,
  numero: 'OC-1',
  numeroNota: '10',
  serieNota: '1',
  modeloNota: '55',
  fornecedorId: 2,
  fornecedorNome: 'Fornecedor',
  status,
  dataEmissao: '2026-09-29',
  moeda: 'BRL',
  subtotal: 100,
  valorFrete: 0,
  valorSeguro: 0,
  outrasDespesas: 0,
  valorDesconto: 0,
  valorTotal: 100,
  version: 0,
  itens: [],
});

const emptyDocuments: PurchaseDocuments = {
  recebimentos: [],
  notas: [],
  contasPagar: [],
  movimentosEstoque: [],
};

describe('purchaseProgressSteps', () => {
  it('aponta o recebimento como próxima etapa de uma compra aprovada', () => {
    expect(purchaseProgressSteps(order('APROVADA'), emptyDocuments).map((step) => step.detail))
      .toEqual(['Ordem registrada', 'Aguardando recebimento', 'Após o recebimento', 'Após a nota']);
  });

  it('interrompe as etapas posteriores quando a entrega é rejeitada', () => {
    expect(purchaseProgressSteps(order('REJEITADA'), emptyDocuments).map((step) => step.detail))
      .toEqual(['Ordem registrada', 'Entrega rejeitada', 'Não aplicável', 'Não aplicável']);
  });
});
