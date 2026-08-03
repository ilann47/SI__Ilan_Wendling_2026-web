import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import GroupAddOutlinedIcon from '@mui/icons-material/GroupAddOutlined';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  TextField,
} from '@mui/material';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { api, describeError, ifMatchHeaders } from '../api/client';
import { tenantQueryKey } from '../api/queryKeys';
import { useAuth } from '../auth/AuthContext';
import { OperationCard } from '../components/enterprise/OperationCard';
import { ResourceIdField } from '../components/enterprise/ResourceIdField';
import { ResourceSnapshot } from '../components/enterprise/ResourceSnapshot';
import { PageHeader } from '../components/common/PageHeader';
import { useSnackbar } from '../components/SnackbarProvider';
import { useOperationalWorkspace } from '../workspace/OperationalWorkspaceContext';

interface OrganizationResponse {
  id: number;
  document: string;
  legalName: string;
  tradeName?: string | null;
  currency: string;
  timeZone: string;
  region: string;
  plan: string;
  status: string;
  version: number;
}

interface MembershipResponse {
  id: number;
  organizationId: number;
  userId: number;
  status: 'ATIVO' | 'SUSPENSO' | 'ENCERRADO';
  origin: string;
  version: number;
  joinedAt: string;
}

interface RoleAssignmentResponse {
  id: number;
  membershipId: number;
  organizationId: number;
  roleCode: string;
  validFrom: string;
  validUntil?: string | null;
  revokedAt?: string | null;
  version: number;
}

function OrganizationProfile() {
  const { activeOrganization } = useAuth();
  const { notify } = useSnackbar();
  const queryClient = useQueryClient();
  const organizationId = activeOrganization!.organizationId;
  const queryKey = tenantQueryKey(organizationId, 'organization-profile');
  const query = useQuery({
    queryKey,
    queryFn: () => api.get<OrganizationResponse>(`/api/v1/organizations/${organizationId}`)
      .then((response) => response.data),
  });
  const [form, setForm] = useState({
    legalName: '', tradeName: '', currency: '', timeZone: '', region: '', plan: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!query.data) return;
    setForm({
      legalName: query.data.legalName,
      tradeName: query.data.tradeName ?? '',
      currency: query.data.currency,
      timeZone: query.data.timeZone,
      region: query.data.region,
      plan: query.data.plan,
    });
  }, [query.data]);

  const update = (name: keyof typeof form, value: string) => setForm((current) => ({
    ...current, [name]: value,
  }));

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!query.data) return;
    setSaving(true);
    setError(null);
    try {
      const response = await api.patch<OrganizationResponse>(
        `/api/v1/organizations/${organizationId}`,
        { ...form, tradeName: form.tradeName.trim() || null },
        { headers: ifMatchHeaders(query.data.version) },
      );
      queryClient.setQueryData(queryKey, response.data);
      notify('Dados da organizacao atualizados.', 'success');
    } catch (cause) {
      setError(describeError(cause));
    } finally {
      setSaving(false);
    }
  };

  if (query.isLoading) return <Box sx={{ py: 8, display: 'grid', placeItems: 'center' }}><CircularProgress /></Box>;
  if (query.isError) return <Alert severity="error">{describeError(query.error)}</Alert>;

  return (
    <OperationCard
      title="Dados empresariais"
      description="Documento, estado, ID e versao sao controlados pelo servidor e nao podem ser alterados."
      error={error}
    >
      <Stack component="form" spacing={2} onSubmit={(event) => void save(event)}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField label="ID" value={query.data?.id ?? ''} disabled fullWidth />
          <TextField label="Documento" value={query.data?.document ?? ''} disabled fullWidth />
          <TextField label="Estado" value={query.data?.status ?? ''} disabled fullWidth />
          <TextField label="Versao" value={query.data?.version ?? ''} disabled fullWidth />
        </Stack>
        <TextField label="Razao social" value={form.legalName} onChange={(event) => update('legalName', event.target.value)} required />
        <TextField label="Nome fantasia" value={form.tradeName} onChange={(event) => update('tradeName', event.target.value)} />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField label="Moeda ISO 4217" value={form.currency} onChange={(event) => update('currency', event.target.value.toUpperCase())} inputProps={{ maxLength: 3 }} required fullWidth />
          <TextField label="Regiao" value={form.region} onChange={(event) => update('region', event.target.value.toUpperCase())} required fullWidth />
          <TextField label="Plano" value={form.plan} onChange={(event) => update('plan', event.target.value.toUpperCase())} required fullWidth />
        </Stack>
        <TextField label="Fuso horario IANA" value={form.timeZone} onChange={(event) => update('timeZone', event.target.value)} required />
        <Button type="submit" variant="contained" disabled={saving} startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveOutlinedIcon />} sx={{ alignSelf: 'flex-start' }}>
          Salvar alteracoes
        </Button>
      </Stack>
    </OperationCard>
  );
}

function MembershipOperations({ canInvite, canManage }: { canInvite: boolean; canManage: boolean }) {
  const { activeOrganization } = useAuth();
  const { recent, remember } = useOperationalWorkspace();
  const organizationId = activeOrganization!.organizationId;
  const [userId, setUserId] = useState('');
  const [membershipId, setMembershipId] = useState('');
  const [membership, setMembership] = useState<MembershipResponse | null>(null);
  const [status, setStatus] = useState<MembershipResponse['status']>('ATIVO');
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (operation: 'create' | 'read' | 'update') => {
    setLoading(operation);
    setError(null);
    try {
      let response;
      if (operation === 'create') {
        response = await api.post<MembershipResponse>(
          `/api/v1/organizations/${organizationId}/memberships`,
          { userId: Number(userId) },
        );
      } else if (operation === 'read') {
        response = await api.get<MembershipResponse>(
          `/api/v1/organizations/${organizationId}/memberships/${Number(membershipId)}`,
        );
      } else {
        if (!membership || membership.id !== Number(membershipId)) {
          throw new Error('Consulte a Membership antes de alterar seu estado.');
        }
        response = await api.patch<MembershipResponse>(
          `/api/v1/organizations/${organizationId}/memberships/${membership.id}`,
          { status },
          { headers: ifMatchHeaders(membership.version) },
        );
      }
      setMembership(response.data);
      setMembershipId(String(response.data.id));
      setStatus(response.data.status);
      remember('membership', {
        id: response.data.id,
        label: `Usuario ${response.data.userId}`,
        version: response.data.version,
        snapshot: { ...response.data },
      });
    } catch (cause) {
      setError(describeError(cause));
    } finally {
      setLoading(null);
    }
  };

  return (
    <Stack spacing={2}>
      <Alert severity="info">
        A API atual nao oferece listagem de Memberships. Cadastre pelo ID global do usuario ou consulte um vinculo conhecido.
      </Alert>
      {canInvite && <OperationCard title="Adicionar usuario" description="Cria uma Membership ativa no tenant atual." error={error}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField label="ID global do usuario" type="number" value={userId} onChange={(event) => setUserId(event.target.value)} inputProps={{ min: 1 }} required fullWidth />
          <Button variant="contained" disabled={!userId || loading !== null} onClick={() => void run('create')} startIcon={loading === 'create' ? <CircularProgress size={18} color="inherit" /> : <GroupAddOutlinedIcon />}>
            Criar vinculo
          </Button>
        </Stack>
      </OperationCard>}
      {canManage && <OperationCard
        title="Consultar e alterar Membership"
        description="A consulta recupera a versao exigida pelo PATCH concorrente. ENCERRADO e terminal."
        error={error}
        result={membership ? <ResourceSnapshot data={{ id: membership.id, userId: membership.userId, status: membership.status, origin: membership.origin, version: membership.version, joinedAt: membership.joinedAt }} /> : undefined}
      >
        <ResourceIdField label="ID da Membership" value={membershipId} onChange={setMembershipId} recent={recent('membership')} />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <Button variant="outlined" disabled={!membershipId || loading !== null} onClick={() => void run('read')} startIcon={loading === 'read' ? <CircularProgress size={18} /> : <SearchOutlinedIcon />}>
            Consultar
          </Button>
          <TextField select label="Novo estado" value={status} onChange={(event) => setStatus(event.target.value as MembershipResponse['status'])} fullWidth>
            <MenuItem value="ATIVO">Ativo</MenuItem>
            <MenuItem value="SUSPENSO">Suspenso</MenuItem>
            <MenuItem value="ENCERRADO">Encerrado</MenuItem>
          </TextField>
          <Button variant="contained" disabled={!membership || loading !== null || membership.status === 'ENCERRADO'} onClick={() => void run('update')} startIcon={loading === 'update' ? <CircularProgress size={18} color="inherit" /> : <SaveOutlinedIcon />}>
            Alterar estado
          </Button>
        </Stack>
      </OperationCard>}
    </Stack>
  );
}

const roleCodes = [
  'ADMIN_ORGANIZACAO', 'GESTOR', 'ORGANIZADOR', 'SUPERVISOR', 'OPERADOR', 'FISCAL_ACESSO',
] as const;

function RoleOperations({ canGrant, canRevoke }: { canGrant: boolean; canRevoke: boolean }) {
  const { activeOrganization } = useAuth();
  const { recent } = useOperationalWorkspace();
  const organizationId = activeOrganization!.organizationId;
  const [membershipId, setMembershipId] = useState('');
  const [roleCode, setRoleCode] = useState<(typeof roleCodes)[number]>('OPERADOR');
  const [assignment, setAssignment] = useState<RoleAssignmentResponse | null>(null);
  const [assignmentId, setAssignmentId] = useState('');
  const [assignmentVersion, setAssignmentVersion] = useState('0');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const grant = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post<RoleAssignmentResponse>(
        `/api/v1/organizations/${organizationId}/memberships/${Number(membershipId)}/role-assignments`,
        { roleCode, validFrom: null, validUntil: null },
      );
      setAssignment(response.data);
      setAssignmentId(String(response.data.id));
      setAssignmentVersion(String(response.data.version));
    } catch (cause) {
      setError(describeError(cause));
    } finally {
      setLoading(false);
    }
  };

  const revoke = async () => {
    setLoading(true);
    setError(null);
    try {
      await api.delete(
        `/api/v1/organizations/${organizationId}/memberships/${Number(membershipId)}/role-assignments/${Number(assignmentId)}`,
        { headers: ifMatchHeaders(Number(assignmentVersion)), data: { reason: reason.trim() } },
      );
      setAssignment((current) => current ? { ...current, revokedAt: new Date().toISOString() } : current);
    } catch (cause) {
      setError(describeError(cause));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack spacing={2}>
      <Alert severity="info">
        O catalogo abaixo reflete os papeis de sistema definidos nas migrations. A API ainda nao oferece leitura de papeis ou atribuicoes existentes.
      </Alert>
      {canGrant && <OperationCard
        title="Conceder papel"
        description="A permissao efetiva passa a valer na proxima requisicao, sem reemitir o JWT."
        error={error}
        result={assignment ? <ResourceSnapshot data={{ id: assignment.id, membershipId: assignment.membershipId, roleCode: assignment.roleCode, version: assignment.version, revokedAt: assignment.revokedAt }} /> : undefined}
      >
        <ResourceIdField label="ID da Membership" value={membershipId} onChange={setMembershipId} recent={recent('membership')} />
        <TextField select label="Papel" value={roleCode} onChange={(event) => setRoleCode(event.target.value as (typeof roleCodes)[number])}>
          {roleCodes.map((code) => <MenuItem key={code} value={code}>{code}</MenuItem>)}
        </TextField>
        <Button variant="contained" disabled={loading || !membershipId} onClick={() => void grant()} startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <AdminPanelSettingsOutlinedIcon />} sx={{ alignSelf: 'flex-start' }}>
          Conceder papel
        </Button>
      </OperationCard>}
      {canRevoke && <OperationCard title="Revogar atribuicao" description="Exige ID, versao conhecida e motivo auditavel." error={error}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField label="ID da atribuicao" type="number" value={assignmentId} onChange={(event) => setAssignmentId(event.target.value)} inputProps={{ min: 1 }} required fullWidth />
          <TextField label="Versao" type="number" value={assignmentVersion} onChange={(event) => setAssignmentVersion(event.target.value)} inputProps={{ min: 0 }} required fullWidth />
        </Stack>
        <TextField label="Motivo da revogacao" value={reason} onChange={(event) => setReason(event.target.value)} inputProps={{ maxLength: 300 }} required multiline minRows={2} />
        <Button variant="outlined" color="error" disabled={loading || !membershipId || !assignmentId || !reason.trim()} onClick={() => void revoke()}>
          Revogar atribuicao
        </Button>
      </OperationCard>}
    </Stack>
  );
}

export function AdministrationPage() {
  const { permissions } = useAuth();
  const [tab, setTab] = useState(0);
  const canOrganization = permissions.includes('organizations:admin');
  const canInvite = permissions.includes('users:invite') || canOrganization;
  const canGrant = permissions.includes('roles:grant');
  const canRevoke = permissions.includes('roles:revoke');
  const available = [
    canOrganization && { label: 'Organizacao', content: <OrganizationProfile /> },
    (canInvite || canOrganization) && {
      label: 'Memberships', content: <MembershipOperations canInvite={canInvite} canManage={canOrganization} />,
    },
    (canGrant || canRevoke) && {
      label: 'Papeis e acessos', content: <RoleOperations canGrant={canGrant} canRevoke={canRevoke} />,
    },
  ].filter(Boolean) as { label: string; content: ReactNode }[];

  useEffect(() => {
    if (tab >= available.length) setTab(0);
  }, [available.length, tab]);

  return (
    <Box>
      <PageHeader title="Administracao" subtitle="Organizacao, vinculos e autorizacao contextual do tenant ativo." />
      <Tabs value={tab} onChange={(_, value) => setTab(value)} variant="scrollable" sx={{ mb: 2 }}>
        {available.map((item) => <Tab key={item.label} label={item.label} />)}
      </Tabs>
      {available[tab]?.content ?? <Alert severity="warning">Nenhuma operacao administrativa disponivel.</Alert>}
    </Box>
  );
}
