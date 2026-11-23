export function tenantQueryKey(
  organizationId: number | null | undefined,
  ...parts: readonly unknown[]
) {
  if (!organizationId) throw new Error('Contexto organizacional ausente.');
  return ['tenant', organizationId, ...parts] as const;
}

export function customersListQueryKey(organizationId: number) {
  return tenantQueryKey(organizationId, 'list', '/api/clientes');
}

export function serviceNotesListQueryKey(organizationId: number) {
  return tenantQueryKey(organizationId, 'list', '/api/notas-servico');
}
