import { CreateOrganizationPanel } from './CreateOrganizationPanel';

/** @deprecated Prefer CreateOrganizationPanel. Mantido para compatibilidade de imports. */
export function OrganizationProvisioningCard() {
  return (
    <CreateOrganizationPanel
      onCreated={() => undefined}
    />
  );
}
