import { Box, CircularProgress } from '@mui/material';
import type { ReactNode } from 'react';
import { NoOrganizationAccessPage } from '../pages/NoOrganizationAccessPage';
import { OrganizationSelectionPage } from '../pages/OrganizationSelectionPage';
import { useAuth } from './AuthContext';

export function OrganizationAccessBoundary({ children }: { children: ReactNode }) {
  const { hasNoOrganizationAccess, isContextLoading, requiresOrganizationSelection } = useAuth();
  if (isContextLoading) {
    return (
      <Box aria-label="Carregando contexto" sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }
  if (hasNoOrganizationAccess) return <NoOrganizationAccessPage />;
  if (requiresOrganizationSelection) return <OrganizationSelectionPage />;
  return <>{children}</>;
}
