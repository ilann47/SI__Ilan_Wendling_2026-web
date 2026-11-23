import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { Alert, Box, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { allowsAccess, type AccessPolicy } from './accessPolicy';

interface PermissionRouteProps extends AccessPolicy {
  children: ReactNode;
}

export function PermissionRoute({ children, ...policy }: PermissionRouteProps) {
  const { permissions, user } = useAuth();
  if (allowsAccess(permissions, policy, user?.perfil)) return <>{children}</>;

  return (
    <Box sx={{ maxWidth: 640, mx: 'auto', py: 6 }}>
      <Alert severity="warning" icon={<LockOutlinedIcon />}>
        <Typography variant="subtitle1">Acesso não autorizado</Typography>
        <Typography variant="body2">
          Seu vínculo atual não possui permissão para esta área.
        </Typography>
        <Link to="/app">Voltar ao início</Link>
      </Alert>
    </Box>
  );
}
