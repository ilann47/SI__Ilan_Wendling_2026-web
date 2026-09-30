import type { AxiosResponse } from 'axios';
import { api, ifMatchHeaders, parseEtagVersion } from './client';

/** Pagina no formato Spring Data (Page<T>). */
export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
  numberOfElements: number;
  empty: boolean;
}

export interface PageParams {
  page?: number;
  size?: number;
  sort?: string;
  [filter: string]: unknown;
}

export interface VersionedResource<T> {
  data: T;
  etag: string;
  version: number;
}

export interface VersionedMutationResult {
  etag: string;
  version: number;
}

function responseEtag(response: AxiosResponse<unknown>): string | null {
  const headers = response.headers as unknown as {
    get?: (name: string) => unknown;
    etag?: unknown;
    ETag?: unknown;
  };
  const value = typeof headers.get === 'function'
    ? headers.get('etag')
    : headers.etag ?? headers.ETag;
  return typeof value === 'string' ? value : null;
}

function bodyVersion(data: unknown): number | null {
  if (!data || typeof data !== 'object' || !('version' in data)) return null;
  const version = Number((data as { version?: unknown }).version);
  return Number.isSafeInteger(version) && version >= 0 ? version : null;
}

function versionMetadata(response: AxiosResponse<unknown>): VersionedMutationResult {
  const etag = responseEtag(response);
  const version = parseEtagVersion(etag);
  if (version === null || etag === null) {
    throw new Error('A API nao retornou um ETag forte valido para o recurso.');
  }
  const versionInBody = bodyVersion(response.data);
  if (versionInBody !== null && versionInBody !== version) {
    throw new Error('ETag diverge da versao retornada no corpo da resposta.');
  }
  return { etag, version };
}

export function isResourcePreconditionConflict(error: unknown): boolean {
  const status = (error as { response?: { status?: number } })?.response?.status;
  return status === 412 || status === 428;
}

/** Remove chaves com valor undefined/null/'' antes de enviar como query string. */
function clean(params: PageParams): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') out[key] = value;
  }
  return out;
}

/** Fabrica de funcoes CRUD para um recurso REST paginado. */
export function createResourceApi<TResponse, TRequest = unknown>(basePath: string) {
  return {
    basePath,
    list: (params: PageParams = {}) =>
      api.get<Page<TResponse>>(basePath, { params: clean(params) }).then((r) => r.data),
    get: (id: number | string) =>
      api.get<TResponse>(`${basePath}/${id}`).then((r) => r.data),
    create: (body: TRequest) =>
      api.post<TResponse>(basePath, body).then((r) => r.data),
    update: (id: number | string, body: TRequest) =>
      api.put<TResponse>(`${basePath}/${id}`, body).then((r) => r.data),
    remove: (id: number | string) =>
      api.delete<void>(`${basePath}/${id}`).then(() => undefined),
    getVersioned: (id: number | string) =>
      api.get<TResponse>(`${basePath}/${id}`).then((response) => ({
        data: response.data,
        ...versionMetadata(response),
      })),
    createVersioned: (body: TRequest) =>
      api.post<TResponse>(basePath, body).then((response) => ({
        data: response.data,
        ...versionMetadata(response),
      })),
    updateVersioned: (id: number | string, body: TRequest, version: number) =>
      api.put<TResponse>(`${basePath}/${id}`, body, { headers: ifMatchHeaders(version) })
        .then((response) => ({ data: response.data, ...versionMetadata(response) })),
    removeVersioned: (id: number | string, version: number) =>
      api.delete<void>(`${basePath}/${id}`, { headers: ifMatchHeaders(version) })
        .then((response) => versionMetadata(response)),
    /** Executa uma acao customizada (ex.: POST /{id}/baixa). */
    action: <R = unknown, B = unknown>(
      method: 'post' | 'put' | 'delete',
      suffix: string,
      options: { body?: B; params?: Record<string, unknown> } = {},
    ) =>
      api
        .request<R>({ method, url: `${basePath}${suffix}`, data: options.body, params: options.params })
        .then((r) => r.data),
  };
}

export type ResourceApi<TResponse, TRequest = unknown> = ReturnType<
  typeof createResourceApi<TResponse, TRequest>
>;
