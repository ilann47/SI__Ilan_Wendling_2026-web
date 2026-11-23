import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from './client';
import { buildNotaEntradaPayload, canCorrectRejectedCreate, inboundNotesApi, itemSubtotal, noteTotals } from './inboundNotes';

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

  it('envia versão e recupera confirmação após timeout sem segundo POST', async () => {
    const body = buildNotaEntradaPayload({ numero: 'N1', fornecedorId: 1, localEstoqueId: 2, itens: [{ produtoId: 3, quantidade: 1, valorUnitario: 10 }] });
    const post = vi.spyOn(api, 'post').mockResolvedValueOnce(response({ id: 17 })).mockRejectedValueOnce(new Error('timeout'));
    const get = vi.spyOn(api, 'get').mockResolvedValue(response({ id: 17, situacao: 'CONFIRMADA' }));
    await inboundNotesApi.createIdempotent(body, 'same-key');
    await expect(inboundNotesApi.confirmRecoverable(17, 3)).resolves.toEqual({ id: 17, situacao: 'CONFIRMADA' });
    expect(post).toHaveBeenNthCalledWith(1, '/api/notas-entrada', body, { headers: { 'Idempotency-Key': 'same-key' } });
    expect(post).toHaveBeenNthCalledWith(2, '/api/notas-entrada/17/confirmacao', null, { headers: { 'If-Match': '"3"' } });
    expect(get).toHaveBeenCalledExactlyOnceWith('/api/notas-entrada/17');
    expect(post).toHaveBeenCalledTimes(2);
  });

  it('consulta o detalhe operacional integrado da nota', async () => {
    const payload = {
      nota: { id: 17 },
      contasPagar: [{ id: 21 }],
      movimentosEstoque: [{ id: 31 }],
    };
    const get = vi.spyOn(api, 'get').mockResolvedValue(response(payload));

    await expect(inboundNotesApi.details(17)).resolves.toBe(payload);
    expect(get).toHaveBeenCalledWith('/api/notas-entrada/17/detalhes');
  });

  it('monta payload fechado da própria nota', () => {
    expect(buildNotaEntradaPayload({
      numero: ' ne-1 ',
      fornecedorId: '2',
      localEstoqueId: 3,
      valorFrete: '',
      itens: [{ produtoId: 4, quantidade: '2', valorUnitario: '10', valorDesconto: '1' }],
    })).toMatchObject({
      numero: 'NE-1',
      fornecedorId: 2,
      localEstoqueId: 3,
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
  it('envia a versão na edição e na prévia do próprio documento, sem mutação na prévia', async () => {
    const put = vi.spyOn(api, 'put').mockResolvedValue(response({ id: 17, version: 4 }));
    const post = vi.spyOn(api, 'post').mockResolvedValue(response({ parcelas: [] }));
    const body = buildNotaEntradaPayload({ numero: 'N1', fornecedorId: 1, localEstoqueId: 2, itens: [{ produtoId: 3, quantidade: 1, valorUnitario: 10 }] });
    await inboundNotesApi.updateDraft(17, body, 3);
    await inboundNotesApi.preview(body, 17, 4);
    expect(put).toHaveBeenCalledWith('/api/notas-entrada/17', body, { headers: { 'If-Match': '"3"' } });
    expect(post).toHaveBeenCalledExactlyOnceWith('/api/notas-entrada/17/previa', body, { headers: { 'If-Match': '"4"' } });
  });
  it('resultado inconclusivo conserva a falha e não faz outro POST de confirmação', async () => {
    const post = vi.spyOn(api, 'post').mockRejectedValue(new Error('timeout'));
    const get = vi.spyOn(api, 'get').mockRejectedValue(new Error('consulta indisponível'));
    await expect(inboundNotesApi.confirmRecoverable(17, 3)).rejects.toThrow('timeout');
    expect(post).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledExactlyOnceWith('/api/notas-entrada/17');
  });
  it('autorização recusada na primeira tentativa difere da recusa de replay ainda incerto', () => {
    for (const status of [401, 403]) {
      expect(canCorrectRejectedCreate({ response: { status } }, false)).toBe(true);
      expect(canCorrectRejectedCreate({ response: { status } }, true)).toBe(false);
    }
    expect(canCorrectRejectedCreate({ response: { status: 404 } }, false)).toBe(true);
    expect(canCorrectRejectedCreate({ response: { status: 500 } }, false)).toBe(false);
  });
});
