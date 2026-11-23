import { Alert, Box, Button, CircularProgress, Stack } from '@mui/material';
import { Fragment, useCallback, useEffect, useState, type ReactNode } from 'react';
import { useInRouterContext, useLocation, useNavigate } from 'react-router-dom';
import { OrganizationSelectionPage } from '../pages/OrganizationSelectionPage';
import { useAuth } from './AuthContext';
import { organizationLanding } from './organizationLanding';

function SelectionLanding({ children, onConsumed }: { children: ReactNode; onConsumed: () => void }) {
  const { permissions, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const requested = location.pathname + location.search + location.hash;
  const target = organizationLanding(requested, permissions, user?.perfil);
  useEffect(() => {
    onConsumed();
    if (target !== requested) navigate(target, { replace: true });
  }, [target, requested, navigate, onConsumed]);
  return target !== requested ? null : children;
}

export function OrganizationAccessBoundary({ children }: { children: ReactNode }) {
  const [selectedExplicitly, setSelectedExplicitly] = useState(false);
  const consumeLanding = useCallback(() => setSelectedExplicitly(false), []);
  const inRouter = useInRouterContext();
  const { activeOrganization, contextError, hasNoOrganizationAccess, isContextLoading, logout,
    openOrganizationSelection, organizations, permissions, refreshOrganizations, requiresOrganizationSelection } = useAuth();
  if (isContextLoading) {
    return (
      <Box aria-label="Carregando contexto" sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }
  if (contextError) return <Box sx={{ maxWidth: 640, mx: 'auto', py: 6, px: 2 }}>
    <Alert severity={contextError === 'denied' ? 'warning' : 'error'}>
      {contextError === 'denied' ? 'Não foi possível validar seu acesso à organização.'
        : 'Não foi possível carregar suas permissões agora.'} Sua sessão foi mantida.
    </Alert>
    <Stack direction="row" gap={1} mt={2} flexWrap="wrap">
      {contextError === 'unavailable' && <Button onClick={() => void refreshOrganizations().catch(() => undefined)}>
        Tentar novamente
      </Button>}
      {organizations.length > 0 && <Button onClick={openOrganizationSelection}>Escolher organização</Button>}
      {contextError === 'denied' && organizations.length === 0 && <Button
        onClick={() => void refreshOrganizations().catch(() => undefined)}>Revalidar acesso</Button>}
      <Button onClick={logout}>Sair</Button>
    </Stack>
  </Box>;
  if (hasNoOrganizationAccess || requiresOrganizationSelection) {
    return <OrganizationSelectionPage onSelectionStart={() => setSelectedExplicitly(true)} onSelectionFailed={() => setSelectedExplicitly(false)} />;
  }
  return <Fragment key={JSON.stringify([activeOrganization?.organizationId, ...[...(permissions ?? [])].sort()])}>
    {selectedExplicitly && inRouter ? <SelectionLanding onConsumed={consumeLanding}>{children}</SelectionLanding> : children}
  </Fragment>;
}
