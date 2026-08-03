import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import { Alert, Box, Button, Stack, Typography } from '@mui/material';
import { useAuth } from '../auth/AuthContext';
import { OrganizationProvisioningCard } from '../features/organizations/OrganizationProvisioningCard';

export function NoOrganizationAccessPage() {
  const { logout, user } = useAuth();
  const account = user?.login ? `A conta "${user.login}"` : 'A conta autenticada';
  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 2 }}>
      <Stack spacing={2.5} sx={{ width: '100%', maxWidth: 560 }}>
        <BusinessOutlinedIcon color="primary" sx={{ fontSize: 48 }} />
        <Box>
          <Typography variant="h5">Nenhum acesso organizacional ativo</Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            {account} ainda nao possui um vinculo ativo com uma organizacao disponivel.
          </Typography>
        </Box>
        <Alert severity="info">
          Solicite a um administrador que crie ou reative sua Membership. A aplicacao nao
          exibira dados globais ou de outra empresa enquanto o vinculo nao existir.
        </Alert>
        {user?.perfil === 'ADMIN' && <OrganizationProvisioningCard />}
        <Button startIcon={<LogoutOutlinedIcon />} onClick={logout} sx={{ alignSelf: 'flex-start' }}>
          Sair
        </Button>
      </Stack>
    </Box>
  );
}
