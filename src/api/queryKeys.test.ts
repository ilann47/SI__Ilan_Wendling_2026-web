import { describe, expect, it } from 'vitest';
import { tenantQueryKey } from './queryKeys';

describe('tenantQueryKey', () => {
  it('inclui a organizacao ativa antes do recurso', () => {
    expect(tenantQueryKey(42, 'events', { status: 'PUBLICADO' }))
      .toEqual(['tenant', 42, 'events', { status: 'PUBLICADO' }]);
  });

  it('falha cedo sem contexto organizacional', () => {
    expect(() => tenantQueryKey(null, 'events')).toThrow('Contexto organizacional ausente');
  });
});
