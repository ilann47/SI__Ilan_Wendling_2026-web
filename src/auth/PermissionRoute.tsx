import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { Alert, Box, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { useAuth } from './AuthContext';

interface PermissionRouteProps {
  anyOf: string[];
  children: ReactNode;
}

export function PermissionRoute({ anyOf, children }: PermissionRouteProps) {
  const { permissions } = useAuth();
  if (anyOf.some((permission) => permissions.includes(permission))) return <>{children}</>;

  return (
    <Box sx={{ maxWidth: 640, mx: 'auto', py: 6 }}>
      <Alert severity="warning" icon={<LockOutlinedIcon />}>
        <Typography variant="subtitle1">Acesso nao autorizado</Typography>
        <Typography variant="body2">
          Seu vinculo atual nao possui permissao para esta area.
        </Typography>
      </Alert>
    </Box>
  );
}
