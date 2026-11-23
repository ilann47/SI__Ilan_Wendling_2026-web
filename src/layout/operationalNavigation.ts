/** Technical dependency diagnostics are not an operational destination. RBAC is unchanged. */
export function isOperationalNavigationPath(path: string): boolean {
  return !/^\/app\/bloqueios(?:[/?#]|$)/.test(path);
}
