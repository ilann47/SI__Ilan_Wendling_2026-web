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
  | 'space'
  | 'event'
  | 'allocation'
  | 'product'
  | 'priceTier'
  | 'hold'
  | 'order'
  | 'credential';

export type WorkspaceState = Partial<Record<WorkspaceKind, WorkspaceResource[]>>;

export function workspaceStorageKey(organizationId: number, membershipId: number): string {
  return `kaneko.workspace.${organizationId}.${membershipId}`;
}

export function mergeWorkspaceResource(
  current: WorkspaceResource[],
  resource: WorkspaceResource,
): WorkspaceResource[] {
  return [resource, ...current.filter((item) => item.id !== resource.id)].slice(0, 20);
}

export function readWorkspace(organizationId: number, membershipId: number): WorkspaceState {
  try {
    const raw = localStorage.getItem(workspaceStorageKey(organizationId, membershipId));
    return raw ? JSON.parse(raw) as WorkspaceState : {};
  } catch {
    return {};
  }
}

export function writeWorkspace(
  organizationId: number,
  membershipId: number,
  state: WorkspaceState,
): void {
  localStorage.setItem(
    workspaceStorageKey(organizationId, membershipId),
    JSON.stringify(state),
  );
}
