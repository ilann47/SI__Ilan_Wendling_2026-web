import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from './client';
import {
  buildStockAdjustmentPayload,
  buildStockCompensationPayload,
  buildStockLocationPayload,
  stockApi,
} from './stock';

function response<T>(data: T): AxiosResponse<T> {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {} as InternalAxiosRequestConfig,
  };
}

describe('Stock API V54', () => {
  afterEach(() => vi.restoreAllMocks());

  it('consulta posicao, saldos, razao e detalhe com os filtros do contrato', async () => {
    const get = vi.spyOn(api, 'get').mockResolvedValue(response({ content: [] }));

    await stockApi.positions({ produtoId: 1, abaixoMinimo: true });
    await stockApi.balances({ produtoId: 1, localEstoqueId: 2 });
    await stockApi.movements({ produtoId: 1, localEstoqueId: 2, tipo: 'AJUSTE', de: '2026-08-01', ate: '2026-08-03' });
    await stockApi.movement(9);

    expect(get).toHaveBeenNthCalledWith(1, '/api/v1/stock-positions', { params: { produtoId: 1, abaixoMinimo: true } });
    expect(get).toHaveBeenNthCalledWith(2, '/api/v1/stock-balances', { params: { produtoId: 1, localEstoqueId: 2 } });
    expect(get).toHaveBeenNthCalledWith(3, '/api/v1/stock-movements', {
      params: { produtoId: 1, localEstoqueId: 2, tipo: 'AJUSTE', de: '2026-08-01', ate: '2026-08-03' },
    });
    expect(get).toHaveBeenNthCalledWith(4, '/api/v1/stock-movements/9');
  });

  it('envia chaves idempotentes e payloads fechados nos comandos append-only', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue(response({ id: 11 }));
    const adjustment = buildStockAdjustmentPayload({
      produtoId: '1', localEstoqueId: '2', delta: '-2.5', custoUnitario: '4.25', motivo: 'CONTAGEM', organizationId: 99, produto: 'NOME',
    });
    const compensation = buildStockCompensationPayload({ motivo: 'CORRECAO', version: 3 });

    await stockApi.adjust(adjustment, 'adjust-key');
    await stockApi.compensate(11, compensation, 'comp-key');

    expect(adjustment).toEqual({ produtoId: 1, localEstoqueId: 2, delta: -2.5, custoUnitario: 4.25, motivo: 'CONTAGEM' });
    expect(compensation).toEqual({ motivo: 'CORRECAO' });
    expect(post).toHaveBeenNthCalledWith(1, '/api/v1/stock-adjustments', adjustment, {
      headers: { 'Idempotency-Key': 'adjust-key' },
    });
    expect(post).toHaveBeenNthCalledWith(2, '/api/v1/stock-movements/11/compensation', compensation, {
      headers: { 'Idempotency-Key': 'comp-key' },
    });
  });

  it('fecha o payload mutavel do local sem tenant ou metadados', () => {
    expect(buildStockLocationPayload({
      nome: 'LOJA', ativo: false, id: 1, version: 2, organizationId: 3,
    })).toEqual({ nome: 'LOJA', ativo: false });
  });
});
