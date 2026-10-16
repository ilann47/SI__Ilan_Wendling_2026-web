import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useLinkedDetail } from './useLinkedDetail';

function wrapper(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => <MemoryRouter initialEntries={[path]}>
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  </MemoryRouter>;
}

describe('detalhe contextual por URL', () => {
  it.each(['-1', '1.2', '1e3', 'abc', '9007199254740993'])('não consulta ID inválido %s', (id) => {
    const load = vi.fn();
    renderHook(() => useLinkedDetail(1, 'contas', load, true), { wrapper: wrapper(`/?detail=${id}`) });
    expect(load).not.toHaveBeenCalled();
  });
  it('não consulta sem permissão', () => {
    const load = vi.fn();
    renderHook(() => useLinkedDetail(1, 'contas', load, false), { wrapper: wrapper('/?detail=5') });
    expect(load).not.toHaveBeenCalled();
  });
  it('não reaproveita dados de outra organização', async () => {
    const load = vi.fn<(id: number) => Promise<{ id: number; nome: string }>>().mockResolvedValueOnce({ id: 5, nome: 'Empresa A' }).mockResolvedValueOnce({ id: 5, nome: 'Empresa B' });
    const { result, rerender } = renderHook(({ org }) => useLinkedDetail(org, 'contas', load, true), { initialProps: { org: 1 }, wrapper: wrapper('/?detail=5') });
    await waitFor(() => expect(result.current.data?.nome).toBe('Empresa A'));
    rerender({ org: 2 });
    expect(result.current.data).toBeUndefined();
    await waitFor(() => expect(result.current.data?.nome).toBe('Empresa B'));
  });
  it('mantém falha de leitura explícita sem criar detalhe falso', async () => {
    const load = vi.fn().mockRejectedValue({ response: { status: 404 } });
    const { result } = renderHook(() => useLinkedDetail(1, 'contas', load, true), { wrapper: wrapper('/?detail=5') });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
  });
});
