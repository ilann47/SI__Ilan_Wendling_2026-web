export interface WorkspaceResource {
  id: number;
  label: string;
  version?: number;
  updatedAt: string;
  snapshot?: Record<string, unknown>;
}

export type WorkspaceKind =
  | 'membership'
  | 'venue'
  | 'facility'
  | 'sector'
  | 'event'
  | 'allocation'
  | 'product'
  | 'priceTier'
  | 'hold'
  | 'order'
  | 'credential';

export type WorkspaceState = Partial<Record<WorkspaceKind, WorkspaceResource[]>>;

export function workspaceStorageKey(organizationId: number): string {
  return `kaneko.workspace.${organizationId}`;
}

export function mergeWorkspaceResource(
  current: WorkspaceResource[],
  resource: WorkspaceResource,
): WorkspaceResource[] {
  return [resource, ...current.filter((item) => item.id !== resource.id)].slice(0, 20);
}

export function readWorkspace(organizationId: number): WorkspaceState {
  try {
    const raw = localStorage.getItem(workspaceStorageKey(organizationId));
    return raw ? JSON.parse(raw) as WorkspaceState : {};
  } catch {
    return {};
  }
}

export function writeWorkspace(organizationId: number, state: WorkspaceState): void {
  localStorage.setItem(workspaceStorageKey(organizationId), JSON.stringify(state));
}
