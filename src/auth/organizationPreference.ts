const LAST_ORGANIZATION_KEY = 'kaneko.lastOrganizationId';

export function readLastOrganizationId(): number | null {
  const value = Number(localStorage.getItem(LAST_ORGANIZATION_KEY));
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

export function rememberLastOrganizationId(organizationId: number): void {
  localStorage.setItem(LAST_ORGANIZATION_KEY, String(organizationId));
}
