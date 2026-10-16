import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { describeError } from '../api/client';
import { tenantQueryKey } from '../api/queryKeys';
import { createResourceApi } from '../api/resource';
import { isResourcePreconditionConflict } from '../api/resource';
import { useSnackbar } from '../components/SnackbarProvider';
import { ResourceFormDialog } from '../components/form/ResourceFormDialog';
import { allConfigs, quickCreateOnlyConfigs } from '../resources';
import {
  hasResourceActionPermission,
  newResourceLabel,
  type ResourceConfig,
} from '../components/crud/resourceConfig';
import { QuickCreateContext } from './quickCreateCore';
import { useAuth } from '../auth/AuthContext';

/** Mapa endpoint -> config de cadastro, para "criar na hora" a partir de um select. */
const configByBasePath = new Map(
  [...allConfigs, ...quickCreateOnlyConfigs].map((config) => [config.basePath, config]),
);

interface StackEntry {
  key: number;
  config: ResourceConfig;
  resolve: (id: number | null) => void;
  mode: 'create' | 'edit';
  resourceId?: number;
  initialValues?: Record<string, unknown>;
  version?: number | null;
  revision: number;
  submitting: boolean;
  reloading?: boolean;
  organizationId?: number;
  error?: string;
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
  const pending = useRef(new Set<number>());
  const currentOrganization = useRef(activeOrganization?.organizationId);
  currentOrganization.current = activeOrganization?.organizationId;

  useEffect(() => {
    const invalid = stack.filter((entry) => entry.organizationId !== activeOrganization?.organizationId
      || !hasResourceActionPermission(entry.config, entry.mode === 'create' ? 'create' : 'update', permissions));
    if (!invalid.length) return;
    invalid.forEach((entry) => entry.resolve(null));
    setStack((current) => current.filter((entry) => !invalid.some((removed) => removed.key === entry.key)));
  }, [activeOrganization?.organizationId, permissions, stack]);

  const configFor = useCallback((basePath: string) => configByBasePath.get(basePath), []);

  const openCreate = useCallback(
    (config: ResourceConfig) => {
      if (config.canCreate === false || (config.tenantAware && !activeOrganization?.organizationId)
        || !hasResourceActionPermission(config, 'create', permissions)) {
        return Promise.resolve(null);
      }
      return new Promise<number | null>((resolve) => {
        const key = (seq.current += 1);
        setStack((s) => [...s, {
          key,
          config,
          resolve,
          mode: 'create',
          revision: 0,
          submitting: false,
          organizationId: activeOrganization?.organizationId,
        }]);
      });
    },
    [permissions, activeOrganization?.organizationId],
  );

  const openEdit = useCallback(
    async (config: ResourceConfig, id: number) => {
      if (config.canEdit === false || (config.tenantAware && !activeOrganization?.organizationId)
        || !hasResourceActionPermission(config, 'update', permissions)) {
        return null;
      }
      const organizationId = activeOrganization?.organizationId;
      try {
        const resource = createResourceApi<Record<string, unknown>, Record<string, unknown>>(config.basePath);
        const current = config.optimisticLocking
          ? await resource.getVersioned(id)
          : { data: await resource.get(id), version: null };
        if (organizationId !== currentOrganization.current) return null;
        return await new Promise<number | null>((resolve) => {
          const key = (seq.current += 1);
          const initialValues = config.toFormValues ? config.toFormValues(current.data) : current.data;
          setStack((entries) => [...entries, {
            key,
            config,
            resolve,
            mode: 'edit',
            resourceId: id,
            initialValues,
            version: current.version,
            revision: 0,
            submitting: false,
            organizationId,
          }]);
        });
      } catch (error) {
        notify(describeError(error), 'error');
        return null;
      }
    },
    [activeOrganization?.organizationId, permissions, notify],
  );

  const finish = useCallback((key: number, result: number | null) => {
    setStack((s) => {
      s.find((e) => e.key === key)?.resolve(result);
      return s.filter((e) => e.key !== key);
    });
  }, []);

  const handleSubmit = useCallback(
    async (entry: StackEntry, values: Record<string, unknown>) => {
      const action = entry.mode === 'create' ? 'create' : 'update';
      if (pending.current.has(entry.key) || entry.organizationId !== currentOrganization.current
        || !hasResourceActionPermission(entry.config, action, permissions)) return;
      pending.current.add(entry.key);
      setStack((s) => s.map((e) => (e.key === entry.key ? { ...e, submitting: true, error: undefined } : e)));
      try {
        const resource = createResourceApi<{ id: number }, Record<string, unknown>>(
          entry.config.basePath,
        );
        let savedId: number;
        if (entry.mode === 'edit') {
          if (entry.resourceId == null) throw new Error('O cadastro a editar não foi identificado.');
          if (entry.config.optimisticLocking) {
            if (entry.version == null) throw new Error('A versão esperada do cadastro não está disponível.');
            await resource.updateVersioned(entry.resourceId, values, entry.version);
          } else {
            await resource.update(entry.resourceId, values);
          }
          savedId = entry.resourceId;
        } else {
          const created = entry.config.optimisticLocking
            ? (await resource.createVersioned(values)).data
            : await resource.create(values);
          savedId = created.id;
        }
        if (entry.organizationId !== currentOrganization.current) return;
        // Apenas o contexto que iniciou o cadastro recebe a seleção e a atualização.
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: entry.organizationId ? tenantQueryKey(entry.organizationId, 'reference-picker', entry.config.basePath)
              : ['reference-picker', 'global', entry.config.basePath],
          }),
          queryClient.invalidateQueries({
            queryKey: entry.organizationId ? tenantQueryKey(entry.organizationId, 'reference-one', entry.config.basePath)
              : ['reference-one', 'global', entry.config.basePath],
          }),
          queryClient.invalidateQueries({
            queryKey: entry.config.tenantAware
              ? tenantQueryKey(entry.organizationId, 'list', entry.config.basePath)
              : ['list', entry.config.basePath],
          }),
        ]);
        notify(`${entry.config.singular} ${entry.mode === 'edit' ? 'atualizado' : 'cadastrado'}.`, 'success');
        finish(entry.key, savedId);
      } catch (err) {
        if (entry.mode === 'edit' && entry.config.optimisticLocking && isResourcePreconditionConflict(err)) {
          setStack((entries) => entries.map((current) => current.key === entry.key ? {
            ...current,
            submitting: false,
            error: 'Este cadastro foi alterado desde que você abriu o formulário. Recarregue os dados antes de tentar novamente.',
          } : current));
          return;
        }
        notify(describeError(err), 'error');
        setStack((s) => s.map((e) => (e.key === entry.key ? { ...e, submitting: false, error: describeError(err) } : e)));
      } finally { pending.current.delete(entry.key); }
    },
    [permissions, queryClient, notify, finish],
  );

  const reloadEdit = useCallback(async (entry: StackEntry) => {
    if (entry.mode !== 'edit' || entry.resourceId == null) return;
    setStack((entries) => entries.map((current) => current.key === entry.key
      ? { ...current, reloading: true } : current));
    try {
      const resource = createResourceApi<Record<string, unknown>, Record<string, unknown>>(entry.config.basePath);
      const current = entry.config.optimisticLocking
        ? await resource.getVersioned(entry.resourceId)
        : { data: await resource.get(entry.resourceId), version: null };
      if (entry.organizationId !== currentOrganization.current) return;
      const initialValues = entry.config.toFormValues ? entry.config.toFormValues(current.data) : current.data;
      setStack((entries) => entries.map((candidate) => candidate.key === entry.key ? {
        ...candidate,
        initialValues,
        version: current.version,
        revision: candidate.revision + 1,
        reloading: false,
        error: undefined,
      } : candidate));
    } catch (error) {
      notify(describeError(error), 'error');
      setStack((entries) => entries.map((candidate) => candidate.key === entry.key
        ? { ...candidate, reloading: false } : candidate));
    }
  }, [notify]);

  const value = useMemo(() => ({ configFor, openCreate, openEdit }), [configFor, openCreate, openEdit]);

  return (
    <QuickCreateContext.Provider value={value}>
      {children}
      {stack.filter((entry) => entry.organizationId === activeOrganization?.organizationId).map((entry) => (
        <ResourceFormDialog
          key={entry.key}
          open
          title={entry.mode === 'edit' ? `Editar ${entry.config.singular.toLowerCase()}` : newResourceLabel(entry.config)}
          fields={entry.config.fields}
          initialValues={entry.initialValues}
          submitting={entry.submitting}
          conflictMessage={entry.error}
          onReload={entry.mode === 'edit' ? () => void reloadEdit(entry) : undefined}
          reloading={entry.reloading}
          resetKey={entry.revision}
          onClose={() => !entry.submitting && finish(entry.key, null)}
          onSubmit={(values) => handleSubmit(entry, values)}
        />
      ))}
    </QuickCreateContext.Provider>
  );
}
