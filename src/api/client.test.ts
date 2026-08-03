import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  api,
  describeError,
  getToken,
  ifMatchHeaders,
  parseEtagVersion,
  setToken,
  setUnauthorizedHandler,
} from './client';

function response(config: InternalAxiosRequestConfig): AxiosResponse {
  return { data: {}, status: 200, statusText: 'OK', headers: {}, config };
}

describe('cliente HTTP', () => {
  beforeEach(() => setUnauthorizedHandler(() => undefined));

  it('persiste e remove o token contextual', () => {
    setToken('token-seguro');
    expect(getToken()).toBe('token-seguro');
    setToken(null);
    expect(getToken()).toBeNull();
  });

  it('envia o bearer token sem alterar o payload', async () => {
    setToken('jwt-contextual');
    const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => response(config));

    const result = await api.get('/teste', { adapter });

    expect(result.config.headers.Authorization).toBe('Bearer jwt-contextual');
    expect(adapter).toHaveBeenCalledOnce();
  });

  it('preserva authorization explicita para validar um token candidato', async () => {
    setToken('jwt-atual');
    const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => response(config));

    const result = await api.get('/permissoes', {
      adapter,
      headers: { Authorization: 'Bearer jwt-candidato' },
    });

    expect(result.config.headers.Authorization).toBe('Bearer jwt-candidato');
  });

  it('notifica a sessão quando a API responde 401', async () => {
    const unauthorized = vi.fn();
    setUnauthorizedHandler(unauthorized);
    const adapter = async (config: InternalAxiosRequestConfig) => {
      throw new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, undefined, {
        ...response(config), status: 401, statusText: 'Unauthorized',
      });
    };

    await expect(api.get('/protegido', { adapter })).rejects.toBeInstanceOf(AxiosError);
    expect(unauthorized).toHaveBeenCalledOnce();
  });

  it('prioriza violações, detalhe e título no Problem Details', () => {
    expect(describeError({ response: { data: { erros: { name: 'Nome inválido.' } } } }))
      .toBe('Nome inválido.');
    expect(describeError({ response: { data: { detail: 'Conflito de versão.' } } }))
      .toBe('Conflito de versão.');
    expect(describeError({ response: { data: { title: 'Não autorizado.' } } }))
      .toBe('Não autorizado.');
  });

  it('propaga a versao no formato exigido por If-Match', () => {
    expect(ifMatchHeaders(7)).toEqual({ 'If-Match': '"7"' });
    expect(parseEtagVersion('"12"')).toBe(12);
    expect(parseEtagVersion('W/"12"')).toBeNull();
  });

  it('mantem timeout global para evitar chamadas indefinidas', () => {
    expect(api.defaults.timeout).toBe(15_000);
  });
});
