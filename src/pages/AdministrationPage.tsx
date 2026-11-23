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
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api, describeError, ifMatchHeaders } from '../api/client';
import { tenantQueryKey } from '../api/queryKeys';
import { useAuth } from '../auth/AuthContext';
import { allowsAccess, MEMBERSHIP_INVITE_ACCESS } from '../auth/accessPolicy';
import { OperationCard } from '../components/enterprise/OperationCard';
import { ResourceIdField } from '../components/enterprise/ResourceIdField';
import { ResourceSnapshot } from '../components/enterprise/ResourceSnapshot';
import { ReferenceSelect } from '../components/form/ReferenceSelect';
import { NumberField } from '../components/form/NumberField';
import { OperationalFormDialog } from '../components/form/OperationalFormDialog';
import { RecordDetailPage } from '../components/listing/RecordDetailPage';
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
  const { activeOrganization, refreshOrganizations } = useAuth();
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
      if (response.data.timeZone !== query.data.timeZone) {
        void refreshOrganizations().catch(() => notify('Fuso salvo. Recarregue a página para atualizar o contexto.', 'warning'));
      }
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
      description="Atualize os dados usados nos documentos e rotinas da empresa."
      error={error}
    >
      <Stack component="form" spacing={2} onSubmit={(event) => void save(event)}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField label="Documento" value={query.data?.document ?? ''} disabled fullWidth />
          <TextField label="Situação" value={query.data?.status ?? ''} disabled fullWidth />
        </Stack>
        <TextField label="Razão social" value={form.legalName} onChange={(event) => update('legalName', event.target.value)} required />
        <TextField label="Nome fantasia" value={form.tradeName} onChange={(event) => update('tradeName', event.target.value)} />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField label="Moeda padrão" value={form.currency} onChange={(event) => update('currency', event.target.value.toUpperCase())} inputProps={{ maxLength: 3 }} required fullWidth helperText="Ex.: BRL" />
          <TextField label="Região" value={form.region} onChange={(event) => update('region', event.target.value.toUpperCase())} required fullWidth />
          <TextField label="Plano" value={form.plan} onChange={(event) => update('plan', event.target.value.toUpperCase())} required fullWidth />
        </Stack>
        <TextField label="Fuso horário" value={form.timeZone} onChange={(event) => update('timeZone', event.target.value)} required helperText="Ex.: America/Sao_Paulo" />
        <Button type="submit" variant="contained" disabled={saving} startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveOutlinedIcon />} sx={{ alignSelf: 'flex-start' }}>
          Salvar alterações
        </Button>
      </Stack>
    </OperationCard>
  );
}

const membershipListPath = '/app/administracao?tab=vinculos';
const validMembershipId = (value: string) => /^\d+$/.test(value) && Number.isSafeInteger(Number(value)) && Number(value) > 0;

function MembershipOperations({ canInvite, canManage }: { canInvite: boolean; canManage: boolean }) {
  const { activeOrganization } = useAuth();
  const { recent, remember } = useOperationalWorkspace();
  const { notify } = useSnackbar();
  const navigate = useNavigate();
  const organizationId = activeOrganization!.organizationId;
  const [inviteOpen, setInviteOpen] = useState(false);
  const [userId, setUserId] = useState('');
  const [membershipId, setMembershipId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const invite = async () => {
    if (!canInvite || loading || !validMembershipId(userId)) return;
    setLoading(true);
    setError(null);
    try {
      const response = await api.post<MembershipResponse>(
        `/api/v1/organizations/${organizationId}/memberships`, { userId: Number(userId) });
      setMembershipId(String(response.data.id));
      remember('membership', {
        id: response.data.id,
        label: `Usuário ${response.data.userId}`,
        version: response.data.version,
      });
      notify('Usuário adicionado à organização.', 'success');
      setUserId('');
      setInviteOpen(false);
    } catch (cause) {
      setError(describeError(cause));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack spacing={2}>
      <Alert severity="info">
        A listagem de vínculos ainda não está disponível. Selecione o usuário pelo cadastro global ou consulte um vínculo conhecido.
      </Alert>
      {canInvite && <Button variant="contained" startIcon={<GroupAddOutlinedIcon />}
        onClick={() => { setError(null); setInviteOpen(true); }} sx={{ alignSelf: 'flex-start' }}>
        Adicionar usuário
      </Button>}
      {canInvite && <OperationalFormDialog open={inviteOpen} onClose={() => setInviteOpen(false)}
        title="Adicionar usuário" description="Cria um vínculo ativo com a organização atual."
        formId="membership-create-form" submitLabel="Criar vínculo" submitting={loading}
        submitDisabled={!userId} dirty={userId !== ''} error={error} maxWidth="sm"
        onSubmit={(event) => { event.preventDefault(); void invite(); }}>
        <ReferenceSelect
          label="Usuário"
          value={userId ? Number(userId) : null}
          onChange={(value) => setUserId(value ? String(value) : '')}
          reference={{ basePath: '/api/usuarios', labelField: 'nome' }}
          required
        />
      </OperationalFormDialog>}
      {canManage && <OperationCard
        title="Consultar vínculo"
        description="Escolha um vínculo recente ou informe seu código para abrir o registro."
      >
        <Stack component="form" spacing={2} onSubmit={(event) => {
          event.preventDefault();
          if (validMembershipId(membershipId)) navigate(`/app/administracao/vinculos/${Number(membershipId)}`, { state: { fromMembershipLookup: true } });
        }}>
          <ResourceIdField label="Vínculo" value={membershipId} onChange={setMembershipId} recent={recent('membership')} />
          <Button type="submit" variant="outlined" disabled={!validMembershipId(membershipId)} startIcon={<SearchOutlinedIcon />} sx={{ alignSelf: 'flex-start' }}>Abrir vínculo</Button>
        </Stack>
      </OperationCard>}
    </Stack>
  );
}

function MembershipDetailPage({ membershipId }: { membershipId: number }) {
  const { activeOrganization } = useAuth();
  const { remember } = useOperationalWorkspace();
  const { notify } = useSnackbar();
  const navigate = useNavigate();
  const { state } = useLocation();
  const queryClient = useQueryClient();
  const organizationId = activeOrganization!.organizationId;
  const path = `/api/v1/organizations/${organizationId}/memberships/${membershipId}`;
  const queryKey = tenantQueryKey(organizationId, 'membership-detail', membershipId);
  const query = useQuery({ queryKey, queryFn: () => api.get<MembershipResponse>(path).then((response) => response.data) });
  const membership = query.isError ? undefined : query.data;
  const [nextStatus, setNextStatus] = useState<MembershipResponse['status'] | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (membership) remember('membership', { id: membership.id, label: `Usuário ${membership.userId}`, version: membership.version });
  }, [membership, remember]);

  const update = async (event: FormEvent) => {
    event.preventDefault();
    if (saving || !membership || membership.status === 'ENCERRADO' || !nextStatus || membership.status === nextStatus) return;
    setSaving(true); setError(null);
    try {
      const { data } = await api.patch<MembershipResponse>(path, { status: nextStatus }, { headers: ifMatchHeaders(membership.version) });
      queryClient.setQueryData(queryKey, data);
      setNextStatus(null);
      notify('Estado do vínculo atualizado.', 'success');
    } catch (cause) { setError(describeError(cause)); } finally { setSaving(false); }
  };
  return <RecordDetailPage title={`Vínculo #${membershipId}`} subtitle="Consulte ou altere o estado do vínculo com a organização." onBack={() => state?.fromMembershipLookup ? navigate(-1) : navigate(membershipListPath, { replace: true })}>
    {query.isLoading && <CircularProgress size={24} />}
    {query.isError && <Alert severity="error" action={<Button onClick={() => void query.refetch()}>Tentar novamente</Button>}>{describeError(query.error)}</Alert>}
    {error && <Alert severity="error">{error}</Alert>}
    {membership && <ResourceSnapshot data={{ id: membership.id, userId: membership.userId, status: membership.status, origin: membership.origin, version: membership.version, joinedAt: membership.joinedAt }} />}
    {membership?.status === 'ENCERRADO' && <Alert severity="info">Um vínculo encerrado não pode ser reativado.</Alert>}
    {membership && membership.status !== 'ENCERRADO' && <Stack component="form" direction={{ xs: 'column', sm: 'row' }} spacing={2} onSubmit={(event) => void update(event)}>
      <TextField select label="Novo estado" value={nextStatus ?? membership.status} onChange={(event) => setNextStatus(event.target.value as MembershipResponse['status'])} fullWidth>
        <MenuItem value="ATIVO">Ativo</MenuItem>
        <MenuItem value="SUSPENSO">Suspenso</MenuItem>
        <MenuItem value="ENCERRADO">Encerrado</MenuItem>
      </TextField>
      <Button type="submit" variant="contained" disabled={saving || !nextStatus || membership.status === nextStatus} startIcon={<SaveOutlinedIcon />}>Alterar estado</Button>
    </Stack>}
  </RecordDetailPage>;
}

const roleCodes = [
  'ADMIN_ORGANIZACAO', 'GESTOR', 'ORGANIZADOR', 'SUPERVISOR', 'OPERADOR', 'FISCAL_ACESSO', 'CAIXA_PATIO',
] as const;

const roleLabels: Record<(typeof roleCodes)[number], string> = {
  ADMIN_ORGANIZACAO: 'Administrador da organização',
  GESTOR: 'Gestor',
  ORGANIZADOR: 'Organizador',
  SUPERVISOR: 'Supervisor',
  OPERADOR: 'Operador',
  FISCAL_ACESSO: 'Fiscal de acesso',
  CAIXA_PATIO: 'Caixa do pátio',
};

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
        O catálogo abaixo apresenta os papéis disponíveis no sistema. A leitura dos papéis já atribuídos ainda não está disponível.
      </Alert>
      {canGrant && <OperationCard
        title="Conceder papel"
        description="A permissão passa a valer na próxima ação do usuário, sem exigir novo login."
        error={error}
        result={assignment ? <ResourceSnapshot data={{ id: assignment.id, membershipId: assignment.membershipId, roleCode: assignment.roleCode, version: assignment.version, revokedAt: assignment.revokedAt }} /> : undefined}
      >
        <ResourceIdField label="Vínculo" value={membershipId} onChange={setMembershipId} recent={recent('membership')} />
        <TextField select label="Papel" value={roleCode} onChange={(event) => setRoleCode(event.target.value as (typeof roleCodes)[number])}>
          {roleCodes.map((code) => <MenuItem key={code} value={code}>{roleLabels[code]}</MenuItem>)}
        </TextField>
        <Button variant="contained" disabled={loading || !membershipId} onClick={() => void grant()} startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <AdminPanelSettingsOutlinedIcon />} sx={{ alignSelf: 'flex-start' }}>
          Conceder papel
        </Button>
      </OperationCard>}
      {canRevoke && <OperationCard title="Revogar atribuição" description="Informe a atribuição atual e registre o motivo da revogação." error={error}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <NumberField label="Atribuição" value={assignmentId} min={1} onValueChange={setAssignmentId} required fullWidth />
          <NumberField label="Revisão da atribuição" value={assignmentVersion} min={0} onValueChange={setAssignmentVersion} required fullWidth />
        </Stack>
        <TextField label="Motivo da revogação" value={reason} onChange={(event) => setReason(event.target.value)} inputProps={{ maxLength: 300 }} required multiline minRows={2} />
        <Button variant="outlined" color="error" disabled={loading || !membershipId || !assignmentId || !reason.trim()} onClick={() => void revoke()}>
          Revogar atribuição
        </Button>
      </OperationCard>}
    </Stack>
  );
}

export function AdministrationPage() {
  const { activeOrganization, permissions, user } = useAuth();
  const navigate = useNavigate();
  const { membershipId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const canOrganization = permissions.includes('organizations:admin');
  const canInvite = allowsAccess(permissions, MEMBERSHIP_INVITE_ACCESS, user?.perfil);
  const canGrant = permissions.includes('roles:grant');
  const canRevoke = permissions.includes('roles:revoke');
  const available = [
    canOrganization && { id: 'organizacao', label: 'Organização', content: <OrganizationProfile /> },
    (canInvite || canOrganization) && {
      id: 'vinculos', label: 'Usuários e vínculos', content: <MembershipOperations canInvite={canInvite} canManage={canOrganization} />,
    },
    (canGrant || canRevoke) && {
      id: 'papeis', label: 'Papéis e acessos', content: <RoleOperations canGrant={canGrant} canRevoke={canRevoke} />,
    },
  ].filter(Boolean) as { id: string; label: string; content: ReactNode }[];

  const tab = available.find((item) => item.id === searchParams.get('tab')) ?? available[0];
  if (membershipId) {
    if (canOrganization && validMembershipId(membershipId)) return <MembershipDetailPage key={activeOrganization?.organizationId + ':' + membershipId} membershipId={Number(membershipId)} />;
    return <RecordDetailPage title="Vínculo indisponível" onBack={() => navigate(membershipListPath, { replace: true })}>
      <Alert severity="warning">Não foi possível abrir o vínculo com o acesso atual.</Alert>
    </RecordDetailPage>;
  }

  return (
    <Box>
      <PageHeader title="Administração" subtitle="Organização, usuários, vínculos e permissões do contexto atual." />
      <Tabs value={tab?.id ?? false} onChange={(_, value) => setSearchParams({ tab: value })} variant="scrollable"
        scrollButtons="auto" allowScrollButtonsMobile aria-label="Áreas administrativas" sx={{ mb: 2 }}>
        {available.map((item) => <Tab key={item.id} value={item.id} label={item.label} />)}
      </Tabs>
      {tab?.content ?? <Alert severity="warning">Nenhuma operação administrativa disponível.</Alert>}
    </Box>
  );
}
