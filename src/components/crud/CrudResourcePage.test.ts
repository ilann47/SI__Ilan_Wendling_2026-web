import type { GridColDef } from '@mui/x-data-grid';
import { describe, expect, it, vi } from 'vitest';
import {
  loadResourcePageById,
  operationalColumns,
  operationalFilters,
} from './CrudResourcePage';
import type { FilterConfig } from './resourceConfig';

describe('apresentação operacional das listagens', () => {
  it('não expõe o identificador interno como coluna principal', () => {
    const columns: GridColDef[] = [
      { field: 'id', headerName: 'ID' },
      { field: 'nome', headerName: 'Nome' },
    ];

    expect(operationalColumns(columns).map((column) => column.field)).toEqual(['nome']);
  });

  it('não oferece filtro técnico de identificador ao operador', () => {
    const filters: FilterConfig[] = [
      { name: 'id', label: 'ID', type: 'number' },
      { name: 'nome', label: 'Nome', type: 'text' },
    ];

    expect(operationalFilters(filters).map((filter) => filter.name)).toEqual(['nome']);
  });
});

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
