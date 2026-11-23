import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from './client';
import {
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

  it('fecha o payload mutavel do local sem tenant ou metadados', () => {
    expect(buildStockLocationPayload({
      nome: 'LOJA', ativo: false, id: 1, version: 2, organizationId: 3,
    })).toEqual({ nome: 'LOJA', ativo: false });
  });
});
