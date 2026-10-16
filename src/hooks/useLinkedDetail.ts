import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { tenantQueryKey } from '../api/queryKeys';

/** Abre um recurso real por URL, sem depender da página atual da listagem. */
export function useLinkedDetail<T>(organizationId: number | undefined, resource: string,
  load: (id: number) => Promise<T>, enabled: boolean) {
  const [params, setParams] = useSearchParams();
  const raw = params.get('detail');
  const id = raw && /^[1-9]\d*$/.test(raw) && Number.isSafeInteger(Number(raw)) ? Number(raw) : null;
  const query = useQuery({
    queryKey: organizationId ? tenantQueryKey(organizationId, 'linked-detail', resource, id) : ['linked-detail', resource, id],
    queryFn: () => load(id!), enabled: enabled && !!organizationId && id !== null,
  });
  const close = () => setParams((current) => {
    const next = new URLSearchParams(current); next.delete('detail'); return next;
  }, { replace: true });
  return { ...query, data: enabled && organizationId && id !== null && !query.isError ? query.data : undefined,
    requested: enabled && !!organizationId && id !== null, close };
}
