import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from './client';
import {
  buildPurchaseOrderPayload,
  buildPurchaseReceiptPayload,
  purchaseApi,
} from './purchases';

function response<T>(data: T): AxiosResponse<T> {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {} as InternalAxiosRequestConfig,
  };
}

describe('Purchase API V63', () => {
  afterEach(() => vi.restoreAllMocks());

  it('consulta documentos da compra sem filtrar vínculos no navegador', async () => {
    const data = { recebimentos: [], notas: null, contasPagar: [], movimentosEstoque: null };
    const get = vi.spyOn(api, 'get').mockResolvedValue(response(data));
    await expect(purchaseApi.documents(12)).resolves.toEqual(data);
    expect(get).toHaveBeenCalledWith('/api/v1/purchase-orders/12/documents');
  });

  it('fecha os payloads de ordem e recebimento sem metadados do tenant', () => {
    expect(buildPurchaseOrderPayload({
      numeroNota: ' 987 ', serieNota: ' 1 ', modeloNota: ' 55 ',
      fornecedorId: '2', moeda: 'brl', valorFrete: '5.50',
      valorSeguro: '2.25', outrasDespesas: '1.75',
      condicaoPagamentoId: '4', transportadoraId: '5', localEstoqueEntregaId: '6',
      tipoFrete: 'FOB', referenciaFornecedor: ' ped-9 ',
      valorDesconto: '99', observacao: ' teste ', organizacaoId: 99,
      observacaoInterna: ' conferir validade ',
      itens: [{ produtoId: '3', quantidade: '2.5', valorUnitario: '10', valorDesconto: '1' }],
    })).toEqual({
      numeroNota: '987', serieNota: '1', modeloNota: '55',
      fornecedorId: 2, moeda: 'BRL', valorFrete: 5.5,
      valorSeguro: 2.25, outrasDespesas: 1.75,
      condicaoPagamentoId: 4, transportadoraId: 5, localEstoqueEntregaId: 6,
      tipoFrete: 'FOB', referenciaFornecedor: 'ped-9',
      valorDesconto: 0, observacao: 'teste',
      observacaoInterna: 'conferir validade',
      itens: [{ produtoId: 3, quantidade: 2.5, valorUnitario: 10, valorDesconto: 1 }],
    });
    expect(buildPurchaseReceiptPayload({
      localEstoqueId: '4', observacao: ' doca 1 ', version: 9,
      itens: [{ itemOrdemCompraId: '8', quantidade: '1.25' }],
    })).toEqual({
      localEstoqueId: 4, observacao: 'doca 1',
      itens: [{ itemOrdemCompraId: 8, quantidade: 1.25 }],
    });
  });

  it('rejeita desconto do item acima de quantidade vezes valor unitário', () => {
    expect(() => buildPurchaseOrderPayload({
      numeroNota: '987', serieNota: '1', modeloNota: '55', fornecedorId: 2,
      itens: [{ produtoId: 3, quantidade: 11, valorUnitario: 12, valorDesconto: 1111 }],
    })).toThrow('O desconto do item não pode exceder R$ 132,00.');
  });

  it('envia idempotencia e If-Match nos comandos do agregado', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue(response({ id: 10 }));
    const order = buildPurchaseOrderPayload({
      numeroNota: '987', serieNota: '1', modeloNota: '55', fornecedorId: 2, itens: [
        { produtoId: 3, quantidade: 2, valorUnitario: 10 },
      ],
    });
    const receipt = buildPurchaseReceiptPayload({
      localEstoqueId: 4, itens: [{ itemOrdemCompraId: 8, quantidade: 2 }],
    });

    await purchaseApi.create(order, 'create-key');
    await purchaseApi.approve(10, 0);
    await purchaseApi.receive(10, receipt, 1, 'receipt-key');

    expect(post).toHaveBeenNthCalledWith(1, '/api/v1/purchase-orders', order, {
      headers: { 'Idempotency-Key': 'create-key' },
    });
    expect(post).toHaveBeenNthCalledWith(2, '/api/v1/purchase-orders/10/approval', null, {
      headers: { 'If-Match': '"0"' },
    });
    expect(post).toHaveBeenNthCalledWith(3, '/api/v1/purchase-orders/10/receipts', receipt, {
      headers: { 'If-Match': '"1"', 'Idempotency-Key': 'receipt-key' },
    });
  });
});
