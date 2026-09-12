import axios, { AxiosError, isAxiosError } from 'axios';

const TOKEN_KEY = 'kaneko.token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

/** Cliente axios. baseURL vazio => mesma origem (o dev server faz proxy de /api). */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '',
  timeout: 15_000,
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token && !config.headers?.Authorization) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let unauthorizedHandler: (() => void) | null = null;
export function setUnauthorizedHandler(fn: (() => void) | null): void {
  unauthorizedHandler = fn;
}

function isAuthCredentialRequest(error: AxiosError): boolean {
  const url = `${error.config?.baseURL ?? ''}${error.config?.url ?? ''}`;
  return url.includes('/api/auth/login') || url.includes('/api/auth/register');
}

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Login/cadastro ainda não possuem sessão; 401 não deve encerrar nada.
    if (
      error.response?.status === 401
      && unauthorizedHandler
      && !isAuthCredentialRequest(error)
    ) {
      unauthorizedHandler();
    }
    return Promise.reject(error);
  },
);

/** Formato ProblemDetail (RFC 7807) devolvido pelo backend. */
export interface ApiProblem {
  status?: number;
  title?: string;
  detail?: string;
  erros?: Record<string, string>;
  traceId?: string;
}

export type DescribeErrorOptions = {
  /** No login, 401 significa credencial inválida — não sessão expirada. */
  context?: 'login' | 'default';
  /** Inclui “Código para suporte” quando houver traceId. Default: true. */
  includeTraceId?: boolean;
};

export function ifMatchHeaders(version: number): Record<'If-Match', string> {
  if (!Number.isSafeInteger(version) || version < 0) {
    throw new Error('Versao de agregado invalida.');
  }
  return { 'If-Match': `"${version}"` };
}

export function parseEtagVersion(etag: string | null | undefined): number | null {
  if (!etag) return null;
  const match = /^"(\d+)"$/.exec(etag);
  if (!match) return null;
  const version = Number(match[1]);
  return Number.isSafeInteger(version) ? version : null;
}

export function getApiProblem(error: unknown): ApiProblem | null {
  const data = (error as AxiosError<ApiProblem> | undefined)?.response?.data;
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  return data;
}

export function getHttpStatus(error: unknown): number | undefined {
  return (error as AxiosError | undefined)?.response?.status;
}

function isTechnicalAxiosMessage(message: string): boolean {
  return /request failed with status code/i.test(message)
    || /^network error$/i.test(message)
    || /err_connection/i.test(message)
    || /econnaborted/i.test(message)
    || /timeout of \d+ms exceeded/i.test(message)
    || /failed to fetch/i.test(message);
}

function messageForStatus(status: number, context: 'login' | 'default'): string {
  if (status === 400) return 'Verifique os dados informados.';
  if (status === 401) {
    return context === 'login'
      ? 'Login ou senha inválidos.'
      : 'Sua sessão expirou. Entre novamente.';
  }
  if (status === 403) return 'Você não possui permissão para realizar esta operação.';
  if (status === 404) return 'O recurso solicitado não foi encontrado.';
  if (status === 409) return 'Operação não permitida por conflito de dados.';
  if (status === 412) return 'Os dados foram alterados. Recarregue e tente novamente.';
  if (status === 422) return 'Não foi possível processar os dados informados.';
  if (status === 429) return 'Muitas tentativas. Aguarde um momento e tente novamente.';
  if (status >= 500) return 'O sistema encontrou um problema. Tente novamente.';
  return 'Não foi possível concluir a operação. Tente novamente.';
}

function isTimeoutError(error: AxiosError): boolean {
  return error.code === 'ECONNABORTED'
    || /timeout/i.test(error.message)
    || error.code === 'ETIMEDOUT';
}

function isUnreachableError(error: AxiosError): boolean {
  return !error.response
    && (
      error.code === 'ERR_NETWORK'
      || error.code === 'ECONNREFUSED'
      || /network error/i.test(error.message)
      || /err_connection/i.test(error.message)
      || Boolean(error.request)
    );
}

function appendTraceId(message: string, traceId: string | undefined, includeTraceId: boolean): string {
  if (!includeTraceId || !traceId?.trim()) return message;
  return `${message} Código para suporte: ${traceId.trim()}`;
}

/** Normaliza qualquer erro de chamada em uma mensagem amigável para o usuário. */
export function describeError(error: unknown, options: DescribeErrorOptions = {}): string {
  const context = options.context ?? 'default';
  const includeTraceId = options.includeTraceId ?? true;
  const problem = getApiProblem(error);
  const status = getHttpStatus(error);
  const ax = error as AxiosError | undefined;

  if (problem?.erros && Object.keys(problem.erros).length > 0) {
    const fields = Object.values(problem.erros).filter(Boolean).join(' ');
    if (fields) return appendTraceId(fields, problem.traceId, includeTraceId);
  }
  if (problem?.detail?.trim()) {
    return appendTraceId(problem.detail.trim(), problem.traceId, includeTraceId);
  }
  if (problem?.title?.trim()) {
    return appendTraceId(problem.title.trim(), problem.traceId, includeTraceId);
  }

  if (typeof status === 'number') {
    return appendTraceId(messageForStatus(status, context), problem?.traceId, includeTraceId);
  }

  if (ax && typeof ax === 'object') {
    if (isTimeoutError(ax) || (!ax.response && isTimeoutError(ax))) {
      return 'A solicitação demorou demais. Tente novamente.';
    }
    if (isUnreachableError(ax) || (!ax.response && (ax.request || ax.code === 'ERR_NETWORK'))) {
      return 'Não foi possível conectar ao servidor.';
    }
    if (isAxiosError(error) || ax.isAxiosError) {
      return 'Não foi possível concluir a operação. Tente novamente.';
    }
  }

  if (error instanceof Error && error.message && !isTechnicalAxiosMessage(error.message)) {
    return error.message;
  }

  if (error instanceof Error && isTechnicalAxiosMessage(error.message)) {
    return 'Não foi possível concluir a operação. Tente novamente.';
  }

  return 'Não foi possível concluir a operação. Tente novamente.';
}
