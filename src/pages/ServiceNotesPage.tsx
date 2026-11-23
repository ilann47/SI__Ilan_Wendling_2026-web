import { Alert } from '@mui/material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { describeError } from '../api/client';
import { serviceNotesListQueryKey } from '../api/queryKeys';
import { serviceNotesApi } from '../api/serviceNotes';
import { useAuth } from '../auth/AuthContext';
import { hasResourceActionPermission, newResourceLabel } from '../components/crud/resourceConfig';
import { ResourceFormPage } from '../components/form/ResourceFormPage';
import { useFormPageLocation } from '../components/form/useFormPageLocation';
import { ServiceNotesList } from '../features/fiscal/ServiceNotesList';
import { serviceNoteListSearch, serviceNotesPath } from '../features/fiscal/serviceNoteNavigation';
import { notaServicoConfig } from '../resources/fiscal';

export function ServiceNotesPage() {
  const { activeOrganization, permissions } = useAuth();
  const [params] = useSearchParams();
  const id = params.get('detail');
  const org = activeOrganization?.organizationId;
  if (!org || !permissions.includes('fiscal:read')) return <Alert severity="warning">Seu acesso não permite consultar notas de serviço.</Alert>;
  if (id && /^[1-9]\d*$/.test(id) && Number.isSafeInteger(Number(id))) {
    return <Navigate to={`${serviceNotesPath}/${id}${serviceNoteListSearch(params)}`} replace />;
  }
  return <ServiceNotes key={org} org={org} permissions={permissions} />;
}

function ServiceNotes({ org, permissions }: { org: number; permissions: string[] }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const client = useQueryClient();
  const form = useFormPageLocation();
  const canCreate = hasResourceActionPermission(notaServicoConfig, 'create', permissions);
  const create = useMutation({
    mutationFn: serviceNotesApi.create,
    onSuccess: () => void client.invalidateQueries({ queryKey: serviceNotesListQueryKey(org) }),
  });
  if (canCreate && form.name === 'novo') {
    return <ResourceFormPage title={newResourceLabel(notaServicoConfig)} fields={notaServicoConfig.fields}
      error={create.error ? describeError(create.error) : undefined} submitting={create.isPending}
      onClose={() => { create.reset(); form.close(); }} onSubmit={create.mutateAsync}
      onSaved={(note) => void navigate(`${serviceNotesPath}/${note.id}${serviceNoteListSearch(params)}`, { replace: true })} />;
  }
  return <ServiceNotesList org={org} showClientFilter={permissions.includes('customers:read')}
    onCreate={canCreate ? () => { create.reset(); form.open('novo'); } : undefined} />;
}
