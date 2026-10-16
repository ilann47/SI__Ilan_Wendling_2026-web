import { describe, expect, it, vi } from 'vitest';
import { loadResourcePageById } from './CrudResourcePage';

describe('loadResourcePageById', () => {
  it('retorna lista vazia quando o recurso realmente não existe', async () => {
    const get = vi.fn().mockRejectedValue({ response: { status: 404 } });

    const page = await loadResourcePageById(get, '42', 10);

    expect(get).toHaveBeenCalledWith(42);
    expect(page.content).toEqual([]);
  });

  it('não esconde falha do servidor como resultado vazio', async () => {
    const failure = { response: { status: 500 } };
    const get = vi.fn().mockRejectedValue(failure);

    await expect(loadResourcePageById(get, '42', 10)).rejects.toBe(failure);
  });

  it('não consulta a API para identificador inválido', async () => {
    const get = vi.fn();

    const page = await loadResourcePageById(get, '-1', 10);

    expect(get).not.toHaveBeenCalled();
    expect(page.content).toEqual([]);
  });
});
