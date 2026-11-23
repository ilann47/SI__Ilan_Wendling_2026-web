import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { matchPath, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { tenantQueryKey } from '../api/queryKeys';

export function linkedDetailId(raw: string | null): number | null {
  return raw && /^[1-9]\d*$/.test(raw) && Number.isSafeInteger(Number(raw)) ? Number(raw) : null;
}

/** Abre um recurso real por URL, sem depender da página atual da listagem. */
export function useLinkedDetail<T>(organizationId: number | undefined, resource: string,
  load: (id: number) => Promise<T>, enabled: boolean, keepListHistory = false,
  routes?: { listPath: string; detailBase?: string }) {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const detailBase = routes?.detailBase ?? routes?.listPath;
  const pathId = detailBase ? matchPath(`${detailBase}/:detailId`, location.pathname)?.params.detailId : undefined;
  const id = linkedDetailId(pathId ?? params.get('detail'));
  const invalidPath = pathId !== undefined && id === null;
  const detailParams = new URLSearchParams(params);
  detailParams.delete('detail');
  const search = detailParams.size ? `?${detailParams}` : '';
  const legacy = detailBase && routes?.listPath === location.pathname && pathId === undefined && id !== null;
  useEffect(() => {
    if (legacy && enabled && organizationId) {
      void navigate({ pathname: `${detailBase}/${id}`, search }, { replace: true, state: location.state });
    }
  }, [detailBase, enabled, id, legacy, location.state, navigate, organizationId, search]);
  const query = useQuery({
    queryKey: organizationId ? tenantQueryKey(organizationId, 'linked-detail', resource, id) : ['linked-detail', resource, id],
    queryFn: () => load(id!), enabled: enabled && !!organizationId && id !== null,
  });
  const close = () => {
    const next = new URLSearchParams(params); next.delete('detail');
    if (routes) {
      next.delete('formulario');
      const listSearch = next.size ? `?${next}` : '';
      const origin = routes.listPath + listSearch;
      if (keepListHistory && location.state?.linkedListOrigin === origin) void navigate(-1);
      else void navigate({ pathname: routes.listPath, search: listSearch }, { replace: true });
      return;
    }
    const origin = `${location.pathname}?${next.toString()}`;
    if (keepListHistory && location.state?.linkedListOrigin === origin) navigate(-1);
    else setParams(next, { replace: true });
  };
  const open = (detailId: number) => {
    if (detailBase) {
      void navigate({ pathname: `${detailBase}/${detailId}`, search }, {
        state: keepListHistory && id === null ? { linkedListOrigin: location.pathname + location.search } : undefined,
      });
      return;
    }
    setParams((current) => {
      const next = new URLSearchParams(current); next.set('detail', String(detailId)); return next;
    }, { preventScrollReset: false,
      state: keepListHistory && id === null ? { linkedListOrigin: `${location.pathname}?${params.toString()}` } : undefined });
  };
  return { ...query, id, data: enabled && organizationId && id !== null && !query.isError ? query.data : undefined,
    isError: query.isError || invalidPath, error: invalidPath ? new Error('Registro inválido.') : query.error,
    requested: enabled && !!organizationId && (id !== null || invalidPath), close, open };
}
