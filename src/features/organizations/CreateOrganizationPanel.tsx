import AddBusinessOutlinedIcon from '@mui/icons-material/AddBusinessOutlined';
import { Alert, Card, CardContent, Stack, Typography } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { describeError, getHttpStatus } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { useSnackbar } from '../../components/SnackbarProvider';
import {
  createOrganizationAsAdmin,
  createOrganizationAsUsuario,
  createOrganizationMembership,
  fetchMeProfile,
} from './organizationApi';
import { OrganizationForm } from './OrganizationForm';
import { accessibleOrganizationsQueryKey, meQueryKey } from './organizationQueryKeys';
import {
  toOrganizationCreateRequest,
  type OrganizationFormValues,
  type SelfServiceOrganizationCreateResponse,
} from './organizationTypes';

type CreatedOrg = {
  organizationId: number;
  legalName: string;
  tradeName?: string | null;
  membershipId?: number;
};

type Props = {
  onCreated: (created: CreatedOrg) => void;
  onCancel?: () => void;
};

export function CreateOrganizationPanel({ onCreated, onCancel }: Props) {
  const queryClient = useQueryClient();
  const { refreshOrganizations, user } = useAuth();
  const { notify } = useSnackbar();
  const meQuery = useQuery({
    queryKey: meQueryKey,
    queryFn: fetchMeProfile,
  });
  const [pendingOrganizationId, setPendingOrganizationId] = useState<number | null>(null);
  const [pendingLegalName, setPendingLegalName] = useState('');
  const [membershipError, setMembershipError] = useState('');

  // Preferir perfil de /api/v1/me; se a API nao enviar o campo, usar a sessao (JWT/login).
  const perfil = meQuery.data?.perfil ?? user?.perfil;
  const canCreate = perfil === 'ADMIN' || perfil === 'USUARIO';

  const finishSuccess = async (created: CreatedOrg, message: string) => {
    await queryClient.invalidateQueries({ queryKey: accessibleOrganizationsQueryKey });
    await refreshOrganizations();
    notify(message, 'success');
    setPendingOrganizationId(null);
    setMembershipError('');
    onCreated(created);
  };

  const usuarioMutation = useMutation({
    mutationFn: async (values: OrganizationFormValues) => {
      const payload = toOrganizationCreateRequest(values);
      return createOrganizationAsUsuario(payload);
    },
    onSuccess: async (data: SelfServiceOrganizationCreateResponse) => {
      await finishSuccess({
        organizationId: data.organization.id,
        legalName: data.organization.legalName,
        tradeName: data.organization.tradeName,
        membershipId: data.membership.id,
      }, 'Organização criada com sucesso.');
    },
  });

  const adminMutation = useMutation({
    mutationFn: async (values: OrganizationFormValues) => {
      const me = meQuery.data ?? await fetchMeProfile();
      const payload = toOrganizationCreateRequest(values);
      let organizationId = pendingOrganizationId;
      let legalName = pendingLegalName;
      if (!organizationId) {
        const created = await createOrganizationAsAdmin(payload);
        organizationId = created.id;
        legalName = created.legalName;
        setPendingOrganizationId(created.id);
        setPendingLegalName(created.legalName);
      }
      try {
        await createOrganizationMembership(organizationId, me.id);
      } catch (cause) {
        setMembershipError(
          'A organização foi criada, mas o vínculo administrativo não foi concluído. Você pode tentar novamente apenas o vínculo.',
        );
        throw cause;
      }
      return { organizationId, legalName };
    },
    onSuccess: async (data) => {
      await finishSuccess({
        organizationId: data.organizationId,
        legalName: data.legalName,
      }, 'Organização criada com sucesso.');
    },
  });

  const retryMembership = async () => {
    if (!pendingOrganizationId || !meQuery.data) return;
    setMembershipError('');
    try {
      await createOrganizationMembership(pendingOrganizationId, meQuery.data.id);
      await finishSuccess({
        organizationId: pendingOrganizationId,
        legalName: pendingLegalName,
      }, 'Organização criada com sucesso.');
    } catch (cause) {
      setMembershipError(describeError(cause));
      if (getHttpStatus(cause) === 403) {
        setMembershipError('Você não tem permissão para concluir o vínculo desta organização.');
      }
    }
  };

  if (meQuery.isLoading && !user?.perfil) {
    return <Alert severity="info">Carregando perfil para liberar a criação…</Alert>;
  }

  if (meQuery.isError && !user?.perfil) {
    return (
      <Alert
        severity="error"
        action={(
          <ButtonLike onClick={() => void meQuery.refetch()}>Tentar novamente</ButtonLike>
        )}
      >
        Não foi possível carregar o perfil. {describeError(meQuery.error)}
      </Alert>
    );
  }

  if (!canCreate) {
    return (
      <Alert severity="info">
        {perfil === 'OPERADOR'
          ? 'Operadores não criam organizações. Solicite um convite ao administrador.'
          : 'Seu perfil não permite criar organizações. Solicite um convite ao administrador.'}
      </Alert>
    );
  }

  const loading = usuarioMutation.isPending || adminMutation.isPending;

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={2}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <AddBusinessOutlinedIcon color="primary" />
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {perfil === 'ADMIN' ? 'Criação administrativa' : 'Criação self-service'}
            </Typography>
          </Stack>
          {membershipError ? (
            <Alert
              severity="warning"
              action={pendingOrganizationId ? (
                <ButtonLike onClick={() => void retryMembership()}>Repetir vínculo</ButtonLike>
              ) : undefined}
            >
              {membershipError}
            </Alert>
          ) : null}
          <OrganizationForm
            title="Nova organização"
            description={
              perfil === 'ADMIN'
                ? 'Fluxo administrativo em duas etapas: organização e vínculo. A entrada na organização é explícita.'
                : 'Cria a organização e seu vínculo administrativo. Você escolhe quando entrar nela.'
            }
            submitLabel={pendingOrganizationId ? 'Concluir vínculo' : 'Criar organização'}
            loading={loading}
            onCancel={onCancel}
            secondaryAction={pendingOrganizationId ? {
              label: 'Repetir somente o vínculo',
              onClick: () => void retryMembership(),
              disabled: loading,
            } : undefined}
            onSubmit={async (values) => {
              if (perfil === 'USUARIO') {
                await usuarioMutation.mutateAsync(values);
                return;
              }
              await adminMutation.mutateAsync(values);
            }}
          />
        </Stack>
      </CardContent>
    </Card>
  );
}

function ButtonLike({ children, onClick }: { children: string; onClick: () => void }) {
  return (
    <Typography
      component="button"
      type="button"
      onClick={onClick}
      sx={{
        border: 0,
        background: 'none',
        color: 'inherit',
        textDecoration: 'underline',
        cursor: 'pointer',
        font: 'inherit',
      }}
    >
      {children}
    </Typography>
  );
}
