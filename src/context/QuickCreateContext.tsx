import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, describeError } from '../api/client';
import { useSnackbar } from '../components/SnackbarProvider';
import { ResourceFormDialog } from '../components/form/ResourceFormDialog';
import { allConfigs } from '../resources';
import { type ResourceConfig } from '../components/crud/resourceConfig';

/** Mapa endpoint -> config de cadastro, para "criar na hora" a partir de um select. */
const configByBasePath = new Map(allConfigs.map((c) => [c.basePath, c]));

interface QuickCreateValue {
  /** Config de cadastro de um endpoint referenciado, se existir um cadastro para ele. */
  configFor: (basePath: string) => ResourceConfig | undefined;
  /** Abre o cadastro do recurso em um diálogo; resolve com o id criado (ou null se cancelado). */
  openCreate: (config: ResourceConfig) => Promise<number | null>;
}

const QuickCreateContext = createContext<QuickCreateValue | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useQuickCreate(): QuickCreateValue | null {
  return useContext(QuickCreateContext);
}

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
  const [stack, setStack] = useState<StackEntry[]>([]);
  const seq = useRef(0);

  const configFor = useCallback((basePath: string) => configByBasePath.get(basePath), []);

  const openCreate = useCallback(
    (config: ResourceConfig) =>
      new Promise<number | null>((resolve) => {
        const key = (seq.current += 1);
        setStack((s) => [...s, { key, config, resolve, submitting: false }]);
      }),
    [],
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
        const created = await api
          .post<{ id: number }>(entry.config.basePath, values)
          .then((r) => r.data);
        // atualiza as opções dos selects que apontam para esse recurso
        queryClient.invalidateQueries({ queryKey: ['reference', entry.config.basePath] });
        notify(`${entry.config.singular} cadastrado.`, 'success');
        finish(entry.key, created.id);
      } catch (err) {
        notify(describeError(err), 'error');
        setStack((s) => s.map((e) => (e.key === entry.key ? { ...e, submitting: false } : e)));
      }
    },
    [queryClient, notify, finish],
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
