import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { describeError } from '../api/client';
import { createResourceApi } from '../api/resource';
import { useSnackbar } from '../components/SnackbarProvider';
import { ResourceFormDialog } from '../components/form/ResourceFormDialog';
import { allConfigs } from '../resources';
import {
  hasResourceActionPermission,
  resourceQueryKey,
  type ResourceConfig,
} from '../components/crud/resourceConfig';
import { QuickCreateContext } from './quickCreateCore';
import { useAuth } from '../auth/AuthContext';

/** Mapa endpoint -> config de cadastro, para "criar na hora" a partir de um select. */
const configByBasePath = new Map(allConfigs.map((c) => [c.basePath, c]));

interface StackEntry {
  key: number;
  config: ResourceConfig;
  resolve: (id: number | null) => void;
  submitting: boolean;
}

/**
 * Habilita o "criar na hora" em qualquer campo de referência: um botão abre o
 * cadastro do recurso referenciado em um diálogo. Como o cadastro reusa os
 * mesmos campos (que podem, eles próprios, ser referências), o aninhamento é
 * recursivo — ex.: ao cadastrar uma Cidade, pode-se abrir o cadastro do Estado
 * e, dentro dele, o do País, cada um empilhado sobre o anterior.
 */
export function QuickCreateProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { notify } = useSnackbar();
  const { activeOrganization, permissions } = useAuth();
  const [stack, setStack] = useState<StackEntry[]>([]);
  const seq = useRef(0);

  const configFor = useCallback((basePath: string) => configByBasePath.get(basePath), []);

  const openCreate = useCallback(
    (config: ResourceConfig) => {
      if (!hasResourceActionPermission(config, 'create', permissions)) {
        return Promise.resolve(null);
      }
      return new Promise<number | null>((resolve) => {
        const key = (seq.current += 1);
        setStack((s) => [...s, { key, config, resolve, submitting: false }]);
      });
    },
    [permissions],
  );

  const finish = useCallback((key: number, result: number | null) => {
    setStack((s) => {
      s.find((e) => e.key === key)?.resolve(result);
      return s.filter((e) => e.key !== key);
    });
  }, []);

  const handleSubmit = useCallback(
    async (entry: StackEntry, values: Record<string, unknown>) => {
      setStack((s) => s.map((e) => (e.key === entry.key ? { ...e, submitting: true } : e)));
      try {
        const resource = createResourceApi<{ id: number }, Record<string, unknown>>(
          entry.config.basePath,
        );
        const created = entry.config.optimisticLocking
          ? (await resource.createVersioned(values)).data
          : await resource.create(values);
        // atualiza as opções dos selects que apontam para esse recurso
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: resourceQueryKey(
              entry.config,
              activeOrganization?.organizationId,
              'reference-picker',
              entry.config.basePath,
            ),
          }),
          queryClient.invalidateQueries({
            queryKey: resourceQueryKey(
              entry.config,
              activeOrganization?.organizationId,
              'reference-one',
              entry.config.basePath,
            ),
          }),
        ]);
        notify(`${entry.config.singular} cadastrado.`, 'success');
        finish(entry.key, created.id);
      } catch (err) {
        notify(describeError(err), 'error');
        setStack((s) => s.map((e) => (e.key === entry.key ? { ...e, submitting: false } : e)));
      }
    },
    [activeOrganization?.organizationId, queryClient, notify, finish],
  );

  const value = useMemo(() => ({ configFor, openCreate }), [configFor, openCreate]);

  return (
    <QuickCreateContext.Provider value={value}>
      {children}
      {stack.map((entry) => (
        <ResourceFormDialog
          key={entry.key}
          open
          title={`Novo(a) ${entry.config.singular}`}
          fields={entry.config.fields}
          submitting={entry.submitting}
          onClose={() => finish(entry.key, null)}
          onSubmit={(values) => handleSubmit(entry, values)}
        />
      ))}
    </QuickCreateContext.Provider>
  );
}
