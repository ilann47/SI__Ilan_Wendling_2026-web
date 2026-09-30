import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  CircularProgress,
  InputAdornment,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { describeError, getHttpStatus } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { readLastOrganizationId } from '../auth/organizationPreference';
import { CreateOrganizationPanel } from '../features/organizations/CreateOrganizationPanel';
import { fetchMeProfile } from '../features/organizations/organizationApi';
import { meQueryKey } from '../features/organizations/organizationQueryKeys';

type HighlightedOrg = {
  organizationId: number;
  legalName: string;
  tradeName?: string | null;
  membershipId?: number;
};

export function OrganizationSelectionPage() {
  const {
    organizations,
    selectOrganization,
    logout,
    activeOrganization,
    cancelOrganizationSelection,
    refreshOrganizations,
    isContextLoading,
    user,
  } = useAuth();
  const meQuery = useQuery({ queryKey: meQueryKey, queryFn: fetchMeProfile });
  const [selecting, setSelecting] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [createdOrg, setCreatedOrg] = useState<HighlightedOrg | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const lastOrganizationId = readLastOrganizationId();
  const perfil = meQuery.data?.perfil ?? user?.perfil;
  const canCreate = perfil === 'ADMIN' || perfil === 'USUARIO';
  const canReturnToActive = !!activeOrganization;
  const term = search.trim().toLocaleLowerCase('pt-BR');

  const visibleOrganizations = useMemo(() => [...organizations]
    .filter((organization) => !term || [organization.legalName, organization.tradeName]
      .filter(Boolean).join(' ').toLocaleLowerCase('pt-BR').includes(term))
    .sort((left, right) => {
      const createdBoost = Number(right.organizationId === createdOrg?.organizationId)
        - Number(left.organizationId === createdOrg?.organizationId);
      if (createdBoost !== 0) return createdBoost;
      return Number(right.organizationId === lastOrganizationId)
        - Number(left.organizationId === lastOrganizationId);
    }), [organizations, term, lastOrganizationId, createdOrg?.organizationId]);

  const enter = async (organizationId: number) => {
    setSelecting(organizationId);
    setError(null);
    try {
      const knownList = organizations.some((item) => item.organizationId === organizationId)
        ? undefined
        : createdOrg && createdOrg.organizationId === organizationId
          ? [{
            organizationId: createdOrg.organizationId,
            legalName: createdOrg.legalName,
            tradeName: createdOrg.tradeName,
            membershipId: createdOrg.membershipId ?? 0,
            membershipVersion: 0,
          }]
          : undefined;
      await selectOrganization(organizationId, knownList);
    } catch (cause) {
      const status = getHttpStatus(cause);
      if (status === 404) {
        setError('Este vínculo não está mais disponível. Atualizamos a lista de organizações.');
        await refreshOrganizations().catch(() => undefined);
      } else if (status === 403) {
        setError(describeError(cause) || 'Você não tem permissão para entrar nesta organização.');
      } else {
        setError(describeError(cause));
      }
    } finally {
      setSelecting(null);
    }
  };

  const refresh = async () => {
    setRefreshing(true);
    setError(null);
    try {
      await refreshOrganizations();
      await meQuery.refetch();
    } catch (cause) {
      setError(describeError(cause));
    } finally {
      setRefreshing(false);
    }
  };

  const empty = !isContextLoading && organizations.length === 0;

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        p: 2,
        pb: 'max(16px, env(safe-area-inset-bottom))',
      }}
    >
      <Stack spacing={2} sx={{ width: '100%', maxWidth: 560 }}>
        <Box>
          <Typography component="h1" variant="h5" sx={{ fontWeight: 800 }}>
            Escolha a organização
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.75 }}>
            O contexto escolhido determina os dados e as permissões exibidos nesta sessão.
            Nenhuma organização é ativada automaticamente.
          </Typography>
        </Box>

        {error ? <Alert severity="error">{error}</Alert> : null}
        {createdOrg ? (
          <Alert
            severity="success"
            action={(
              <Button color="inherit" size="small" onClick={() => void enter(createdOrg.organizationId)}>
                Entrar nesta organização
              </Button>
            )}
          >
            Organização “{createdOrg.tradeName || createdOrg.legalName}” criada com sucesso.
            Entre nela quando quiser.
          </Alert>
        ) : null}

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <TextField
            label="Pesquisar organização"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start"><SearchOutlinedIcon /></InputAdornment>
              ),
            }}
          />
          <Button
            variant="outlined"
            startIcon={refreshing ? <CircularProgress size={16} /> : <RefreshOutlinedIcon />}
            onClick={() => void refresh()}
            disabled={refreshing || isContextLoading}
            sx={{ minHeight: 56, flexShrink: 0 }}
          >
            Atualizar
          </Button>
        </Stack>

        {isContextLoading ? (
          <Stack spacing={1.5} aria-label="Carregando organizações">
            <Skeleton variant="rounded" height={96} />
            <Skeleton variant="rounded" height={96} />
          </Stack>
        ) : null}

        {!isContextLoading && visibleOrganizations.map((organization) => {
          const isActive = organization.organizationId === activeOrganization?.organizationId;
          const isCreated = organization.organizationId === createdOrg?.organizationId;
          return (
            <Card key={organization.organizationId} variant="outlined">
              <CardContent sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <BusinessOutlinedIcon color="primary" />
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="subtitle1" noWrap>
                    {organization.tradeName || organization.legalName}
                  </Typography>
                  {organization.tradeName ? (
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {organization.legalName}
                    </Typography>
                  ) : null}
                  <Stack direction="row" spacing={0.75} sx={{ mt: 0.75, flexWrap: 'wrap', gap: 0.5 }}>
                    {isActive ? <Chip label="Ativa nesta sessão" size="small" color="success" variant="outlined" /> : null}
                    {isCreated ? <Chip label="Recém-criada" size="small" color="secondary" variant="outlined" /> : null}
                    {organization.organizationId === lastOrganizationId ? (
                      <Chip label="Usada recentemente" size="small" color="primary" variant="outlined" />
                    ) : null}
                  </Stack>
                </Box>
              </CardContent>
              <CardActions sx={{ justifyContent: 'flex-end' }}>
                <Button
                  variant="contained"
                  onClick={() => void enter(organization.organizationId)}
                  disabled={selecting !== null || isActive}
                  startIcon={selecting === organization.organizationId
                    ? <CircularProgress size={16} color="inherit" />
                    : undefined}
                >
                  {isActive ? 'Em uso' : 'Entrar'}
                </Button>
              </CardActions>
            </Card>
          );
        })}

        {!isContextLoading && !empty && visibleOrganizations.length === 0 ? (
          <Alert severity="info">Nenhuma organização corresponde à pesquisa.</Alert>
        ) : null}

        {empty ? (
          <Alert severity="info">
            {perfil === 'OPERADOR'
              ? 'Você ainda não possui acesso a uma organização. Solicite um convite ao administrador.'
              : 'Você ainda não possui organizações.'}
          </Alert>
        ) : null}

        {canCreate ? (
          showCreate ? (
            <CreateOrganizationPanel
              onCancel={() => setShowCreate(false)}
              onCreated={(created) => {
                setCreatedOrg(created);
                setShowCreate(false);
              }}
            />
          ) : (
            <Button variant="outlined" onClick={() => setShowCreate(true)} sx={{ alignSelf: 'flex-start', minHeight: 44 }}>
              {empty ? 'Criar minha organização' : 'Criar organização'}
            </Button>
          )
        ) : null}

        {!canCreate && perfil === 'OPERADOR' ? (
          <Alert severity="info">
            Operadores não criam organizações. Use um convite ou uma conta ADMIN/USUARIO.
          </Alert>
        ) : null}
        {!canCreate && perfil && perfil !== 'OPERADOR' ? (
          <Alert severity="info">
            Seu perfil atual ({perfil}) não permite criar organizações nesta conta.
          </Alert>
        ) : null}

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          {canReturnToActive ? (
            <Button variant="contained" onClick={cancelOrganizationSelection} sx={{ minHeight: 44 }}>
              Voltar para a organização atual
            </Button>
          ) : null}
          <Button color="inherit" onClick={logout} sx={{ minHeight: 44 }}>Sair</Button>
        </Stack>
      </Stack>
    </Box>
  );
}
