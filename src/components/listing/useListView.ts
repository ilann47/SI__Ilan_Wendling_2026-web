import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

export const listSizes = [10, 25, 50];
export type ListSortOption = { value: string; label: string };

export function useListView(sorts: readonly ListSortOption[]) {
  const [params, setParams] = useSearchParams();
  const rawPage = params.get('page');
  const page = rawPage && /^\d+$/.test(rawPage) && Number.isSafeInteger(Number(rawPage)) ? Number(rawPage) : 0;
  const rawSize = Number(params.get('size'));
  const size = listSizes.includes(rawSize) ? rawSize : listSizes[0];
  const sort = sorts.find((option) => option.value === params.get('sort'))?.value ?? sorts[0].value;
  const change = (values: Record<string, string | number | null | undefined>) => setParams((current) => {
    const next = new URLSearchParams(current);
    for (const [key, value] of Object.entries(values)) {
      if (value == null || value === '') next.delete(key);
      else next.set(key, String(value));
    }
    return next;
  }, { replace: true });
  return {
    page, size, sort, change,
    setPage: (next: number) => change({ page: next || null }),
    setSize: (next: number) => change({ page: null, size: next === listSizes[0] ? null : next }),
    setSort: (next: string) => change({ page: null, sort: next === sorts[0].value ? null : next }),
  };
}

export function useCorrectListPage({ page, size, setPage }: ReturnType<typeof useListView>, total?: number) {
  useEffect(() => {
    if (total === undefined) return;
    const lastPage = Math.max(0, Math.ceil(total / size) - 1);
    if (page > lastPage) setPage(lastPage);
  }, [page, size, total, setPage]);
}
