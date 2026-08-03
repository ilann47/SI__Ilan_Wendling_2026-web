export function tenantQueryKey(
  organizationId: number | null | undefined,
  ...parts: readonly unknown[]
) {
  if (!organizationId) throw new Error('Contexto organizacional ausente.');
  return ['tenant', organizationId, ...parts] as const;
}
