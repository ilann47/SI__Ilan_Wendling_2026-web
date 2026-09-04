import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';
import {
  mergeWorkspaceResource,
  readWorkspace,
  writeWorkspace,
  type WorkspaceKind,
  type WorkspaceResource,
  type WorkspaceState,
} from './workspaceStore';

interface OperationalWorkspaceValue {
  resources: WorkspaceState;
  recent: (kind: WorkspaceKind) => WorkspaceResource[];
  remember: (
    kind: WorkspaceKind,
    resource: Omit<WorkspaceResource, 'updatedAt'> & { updatedAt?: string },
  ) => void;
  clear: () => void;
}

const emptyWorkspace: OperationalWorkspaceValue = {
  resources: {},
  recent: () => [],
  remember: () => undefined,
  clear: () => undefined,
};

const OperationalWorkspaceContext = createContext<OperationalWorkspaceValue>(emptyWorkspace);

export function useOperationalWorkspace(): OperationalWorkspaceValue {
  return useContext(OperationalWorkspaceContext);
}

export function OperationalWorkspaceProvider({ children }: { children: ReactNode }) {
  const { activeOrganization } = useAuth();
  const organizationId = activeOrganization?.organizationId;
  const membershipId = activeOrganization?.membershipId;
  const [resources, setResources] = useState<WorkspaceState>({});

  useEffect(() => {
    setResources(
      organizationId && membershipId
        ? readWorkspace(organizationId, membershipId)
        : {},
    );
  }, [membershipId, organizationId]);

  const remember = useCallback<OperationalWorkspaceValue['remember']>((kind, resource) => {
    if (!organizationId || !membershipId) {
      throw new Error('Contexto organizacional ausente.');
    }
    setResources((current) => {
      const next = {
        ...current,
        [kind]: mergeWorkspaceResource(current[kind] ?? [], {
          ...resource,
          updatedAt: resource.updatedAt ?? new Date().toISOString(),
        }),
      };
      writeWorkspace(organizationId, membershipId, next);
      return next;
    });
  }, [membershipId, organizationId]);

  const clear = useCallback(() => {
    if (!organizationId || !membershipId) return;
    const next = {};
    writeWorkspace(organizationId, membershipId, next);
    setResources(next);
  }, [membershipId, organizationId]);

  const recent = useCallback((kind: WorkspaceKind) => resources[kind] ?? [], [resources]);

  return (
    <OperationalWorkspaceContext.Provider value={{ resources, recent, remember, clear }}>
      {children}
    </OperationalWorkspaceContext.Provider>
  );
}
