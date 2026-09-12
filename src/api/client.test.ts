import { AxiosError, AxiosHeaders } from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  api,
  describeError,
  getApiProblem,
  getHttpStatus,
  setUnauthorizedHandler,
} from './client';

function axiosError(partial: {
  status?: number;
  data?: unknown;
  code?: string;
  message?: string;
  url?: string;
  withRequest?: boolean;
}): AxiosError {
  const error = new AxiosError(
    partial.message ?? (partial.status ? `Request failed with status code ${partial.status}` : 'Network Error'),
    partial.code,
  );
  if (partial.status !== undefined) {
    error.response = {
      status: partial.status,
      statusText: 'Error',
      data: partial.data,
      headers: {},
      config: { headers: new AxiosHeaders() },
    };
  }
  if (partial.withRequest || partial.status === undefined) {
    error.request = {};
  }
  error.config = {
    headers: new AxiosHeaders(),
    url: partial.url ?? '/api/v1/qualquer',
  };
  return error;
}

afterEach(() => {
  setUnauthorizedHandler(null);
  vi.restoreAllMocks();
});

describe('describeError', () => {
  it('prioriza erros de campo do ProblemDetail', () => {
    const message = describeError(axiosError({
      status: 400,
      data: {
        title: 'Requisicao invalida',
        detail: 'Ha campos invalidos',
        erros: { email: 'E-mail inválido.', login: 'Login curto.' },
        traceId: 'abc-123',
      },
    }));
    expect(message).toContain('E-mail inválido.');
    expect(message).toContain('Login curto.');
    expect(message).toContain('Código para suporte: abc-123');
  });

  it('usa detail do ProblemDetail antes do mapeamento de status', () => {
    expect(describeError(
      axiosError({
        status: 401,
        data: { title: 'Nao autenticado', detail: 'Login ou senha inválidos.', traceId: 't-1' },
      }),
      { context: 'login' },
    )).toContain('Login ou senha inválidos.');
  });

  it('mapeia 401 de login quando nao ha corpo util', () => {
    expect(describeError(
      axiosError({ status: 401, message: 'Request failed with status code 401' }),
      { context: 'login' },
    )).toBe('Login ou senha inválidos.');
  });

  it('mapeia 401 padrao como sessao expirada', () => {
    expect(describeError(
      axiosError({ status: 401, message: 'Request failed with status code 401' }),
    )).toBe('Sua sessão expirou. Entre novamente.');
  });

  it('nunca apresenta texto tecnico do Axios em 500', () => {
    const message = describeError(axiosError({
      status: 500,
      message: 'Request failed with status code 500',
      data: '<html>error</html>',
    }));
    expect(message).toBe('O sistema encontrou um problema. Tente novamente.');
    expect(message).not.toMatch(/request failed/i);
    expect(message).not.toMatch(/status code/i);
  });

  it('apresenta servidor inacessivel em Network Error', () => {
    expect(describeError(axiosError({
      code: 'ERR_NETWORK',
      message: 'Network Error',
      withRequest: true,
    }))).toBe('Não foi possível conectar ao servidor.');
  });

  it('apresenta mensagem especifica de timeout', () => {
    expect(describeError(axiosError({
      code: 'ECONNABORTED',
      message: 'timeout of 15000ms exceeded',
      withRequest: true,
    }))).toBe('A solicitação demorou demais. Tente novamente.');
  });

  it('mapeia demais status amigaveis', () => {
    expect(describeError(axiosError({ status: 403 }))).toBe('Você não possui permissão para realizar esta operação.');
    expect(describeError(axiosError({ status: 404 }))).toBe('O recurso solicitado não foi encontrado.');
    expect(describeError(axiosError({ status: 409 }))).toBe('Operação não permitida por conflito de dados.');
    expect(describeError(axiosError({ status: 412 }))).toBe('Os dados foram alterados. Recarregue e tente novamente.');
    expect(describeError(axiosError({ status: 422 }))).toBe('Não foi possível processar os dados informados.');
    expect(describeError(axiosError({ status: 429 }))).toBe('Muitas tentativas. Aguarde um momento e tente novamente.');
    expect(describeError(axiosError({ status: 400 }))).toBe('Verifique os dados informados.');
  });

  it('preserva traceId sem substituir a mensagem principal', () => {
    const message = describeError(axiosError({
      status: 500,
      data: { title: 'Erro', detail: 'Falha interna controlada.', traceId: 'trace-xyz' },
    }));
    expect(message.startsWith('Falha interna controlada.')).toBe(true);
    expect(message).toContain('Código para suporte: trace-xyz');
  });

  it('permite omitir o codigo de suporte', () => {
    expect(describeError(
      axiosError({
        status: 500,
        data: { detail: 'Falha interna controlada.', traceId: 'trace-xyz' },
      }),
      { includeTraceId: false },
    )).toBe('Falha interna controlada.');
  });
});

describe('getApiProblem / getHttpStatus', () => {
  it('extrai ProblemDetail e status', () => {
    const error = axiosError({
      status: 409,
      data: { title: 'Conflito', detail: 'duplicado', traceId: 't' },
    });
    expect(getHttpStatus(error)).toBe(409);
    expect(getApiProblem(error)?.detail).toBe('duplicado');
  });

  it('ignora corpo nao objeto', () => {
    expect(getApiProblem(axiosError({ status: 500, data: 'plain' }))).toBeNull();
  });
});

describe('interceptor 401', () => {
  it('nao encerra sessao na tentativa de login', async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    const error = axiosError({
      status: 401,
      url: '/api/auth/login',
      data: { detail: 'Login ou senha inválidos.' },
    });

    await expect(Promise.reject(error).catch((cause: AxiosError) => {
      // Simula o caminho do interceptor exportado via rejeicao da api.
      const interceptor = (api.interceptors.response as unknown as {
        handlers: Array<{ rejected?: (err: AxiosError) => Promise<unknown> }>;
      }).handlers[0];
      return interceptor.rejected!(cause);
    })).rejects.toBe(error);
    expect(handler).not.toHaveBeenCalled();
  });

  it('encerra sessao em 401 de API autenticada', async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    const error = axiosError({
      status: 401,
      url: '/api/v1/me',
    });

    const interceptor = (api.interceptors.response as unknown as {
      handlers: Array<{ rejected?: (err: AxiosError) => Promise<unknown> }>;
    }).handlers[0];

    await expect(interceptor.rejected!(error)).rejects.toBe(error);
    expect(handler).toHaveBeenCalledOnce();
  });
});
