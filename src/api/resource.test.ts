import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from './client';
import { createResourceApi, isResourcePreconditionConflict } from './resource';

function response<T>(data: T, etag?: string): AxiosResponse<T> {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: etag ? { etag } : {},
    config: {} as InternalAxiosRequestConfig,
  };
}

describe('ResourceApi com locking otimista', () => {
  afterEach(() => vi.restoreAllMocks());

  it('captura ETag forte e valida a versao do corpo no detalhe e criacao', async () => {
    vi.spyOn(api, 'get').mockResolvedValue(response({ id: 7, version: 3 }, '"3"'));
    vi.spyOn(api, 'post').mockResolvedValue(response({ id: 8, version: 0 }, '"0"'));
    const resource = createResourceApi<{ id: number; version: number }, { nome: string }>('/api/catalogo');

    await expect(resource.getVersioned(7)).resolves.toEqual({
      data: { id: 7, version: 3 },
      etag: '"3"',
      version: 3,
    });
    await expect(resource.createVersioned({ nome: 'NOVO' })).resolves.toEqual({
      data: { id: 8, version: 0 },
      etag: '"0"',
      version: 0,
    });
  });

  it('envia If-Match forte em update e delete e captura a nova versao', async () => {
    const put = vi.spyOn(api, 'put').mockResolvedValue(response({ id: 7, version: 5 }, '"5"'));
    const remove = vi.spyOn(api, 'delete').mockResolvedValue(response(undefined, '"6"'));
    const resource = createResourceApi<{ id: number; version: number }, { nome: string }>('/api/catalogo');

    await expect(resource.updateVersioned(7, { nome: 'ALTERADO' }, 4)).resolves.toMatchObject({
      version: 5,
      etag: '"5"',
    });
    expect(put).toHaveBeenCalledWith(
      '/api/catalogo/7',
      { nome: 'ALTERADO' },
      { headers: { 'If-Match': '"4"' } },
    );

    await expect(resource.removeVersioned(7, 5)).resolves.toEqual({ version: 6, etag: '"6"' });
    expect(remove).toHaveBeenCalledWith(
      '/api/catalogo/7',
      { headers: { 'If-Match': '"5"' } },
    );
  });

  it('rejeita resposta com ETag divergente da versao do corpo', async () => {
    vi.spyOn(api, 'get').mockResolvedValue(response({ id: 7, version: 4 }, '"3"'));
    const resource = createResourceApi<{ id: number; version: number }>('/api/catalogo');

    await expect(resource.getVersioned(7)).rejects.toThrow('ETag diverge da versao');
  });

  it('classifica 428 e 412 como conflitos recarregaveis', () => {
    expect(isResourcePreconditionConflict({ response: { status: 428 } })).toBe(true);
    expect(isResourcePreconditionConflict({ response: { status: 412 } })).toBe(true);
    expect(isResourcePreconditionConflict({ response: { status: 409 } })).toBe(false);
  });
});
