import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from './client';
import { buildNotaEntradaPayload, inboundNotesApi, itemSubtotal, noteTotals } from './inboundNotes';

function response<T>(data: T): AxiosResponse<T> {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {} as InternalAxiosRequestConfig,
  };
}

describe('inboundNotes', () => {
  afterEach(() => vi.restoreAllMocks());

  it('mantém chave de registro e recupera confirmação já aplicada após timeout', async () => {
    const note = { id: 17, situacao: 'CONFIRMADA' };
    const post = vi.spyOn(api, 'post').mockResolvedValueOnce(response(note));
    const request = vi.spyOn(api, 'request').mockRejectedValue(new Error('timeout'));
    vi.spyOn(api, 'get').mockResolvedValue(response(note));
    const body = buildNotaEntradaPayload({ numero: 'N1', fornecedorId: 1, localEstoqueId: 2,
      itens: [{ produtoId: 3, quantidade: 1, valorUnitario: 10 }] });
    await inboundNotesApi.createIdempotent(body, 'same-key');
    expect(post).toHaveBeenNthCalledWith(1, '/api/notas-entrada', body, { headers: { 'Idempotency-Key': 'same-key' } });
    await expect(inboundNotesApi.confirmRecoverable(17)).resolves.toEqual(note);
    expect(request).toHaveBeenCalledExactlyOnceWith({
      method: 'post', url: '/api/notas-entrada/17/confirmacao', data: undefined, params: undefined,
    });
    expect(api.get).toHaveBeenCalledExactlyOnceWith('/api/notas-entrada/17');
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('consulta o detalhe operacional integrado da nota', async () => {
    const payload = {
      nota: { id: 17 },
      ordemCompra: { id: 4, numero: 'OC-4', status: 'RECEBIDA' },
      recebimento: { id: 9 },
      contasPagar: [{ id: 21 }],
      movimentosEstoque: [{ id: 31 }],
    };
    const get = vi.spyOn(api, 'get').mockResolvedValue(response(payload));

    await expect(inboundNotesApi.details(17)).resolves.toBe(payload);
    expect(get).toHaveBeenCalledWith('/api/notas-entrada/17/detalhes');
  });

  it('monta payload fechado e inclui recebimento opcional', () => {
    expect(buildNotaEntradaPayload({
      numero: ' ne-1 ',
      fornecedorId: '2',
      localEstoqueId: 3,
      recebimentoCompraId: 9,
      valorFrete: '',
      itens: [{ produtoId: 4, quantidade: '2', valorUnitario: '10', valorDesconto: '1' }],
    })).toMatchObject({
      numero: 'NE-1',
      fornecedorId: 2,
      localEstoqueId: 3,
      recebimentoCompraId: 9,
      valorFrete: 0,
      itens: [{ produtoId: 4, quantidade: 2, valorUnitario: 10, valorDesconto: 1 }],
    });
  });

  it('recusa nota sem itens', () => {
    expect(() => buildNotaEntradaPayload({
      numero: 'N1',
      fornecedorId: 1,
      localEstoqueId: 1,
      itens: [],
    })).toThrow('Inclua ao menos um item');
  });

  it('calcula subtotal e total geral', () => {
    expect(itemSubtotal({ quantidade: 2, valorUnitario: 10, valorDesconto: 1 })).toBe(19);
    expect(noteTotals({
      itens: [{ quantidade: 2, valorUnitario: 10, valorDesconto: 1 }],
      valorFrete: 5,
      valorSeguro: 1,
      outrasDespesas: 2,
      valorDesconto: 3,
    })).toEqual({ produtos: 19, total: 24 });
  });
});
