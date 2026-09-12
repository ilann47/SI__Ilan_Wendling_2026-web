import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
import { Alert, Box, Button, Stack, Typography } from '@mui/material';
import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { describeError } from '../api/client';
import { OrganizationProvisioningCard } from '../features/organizations/OrganizationProvisioningCard';
import { getThemeTokens } from '../theme/hubTokens';
import { useColorMode } from '../context/ColorModeContext';

export function NoOrganizationAccessPage() {
  const { logout, user, refreshOrganizations } = useAuth();
  const { mode } = useColorMode();
  const colors = getThemeTokens(mode);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState('');

  const refresh = async () => {
    setRefreshError('');
    setRefreshing(true);
    try {
      await refreshOrganizations();
    } catch (cause) {
      setRefreshError(describeError(cause));
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        p: 2,
        pb: 'max(16px, env(safe-area-inset-bottom))',
        bgcolor: colors.background,
      }}
    >
      <Stack spacing={2.5} sx={{ width: '100%', maxWidth: 560 }}>
        <BusinessOutlinedIcon sx={{ fontSize: 48, color: colors.purple }} />
        <Box>
          <Typography component="h1" variant="h5" sx={{ fontWeight: 800 }}>
            Bem-vindo ao Kaneko
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            Sua conta foi criada com sucesso. Você ainda não possui acesso a uma organização.
          </Typography>
        </Box>
        <Alert severity="info">
          Quando você receber um convite, a organização aparecerá automaticamente aqui.
        </Alert>
        {refreshError ? (
          <Alert severity="error">{refreshError}</Alert>
        ) : null}
        {user?.perfil === 'ADMIN' && <OrganizationProvisioningCard />}
        {user?.perfil !== 'ADMIN' && (
          <Box>
            <Button
              variant="outlined"
              disabled
              aria-disabled="true"
              aria-describedby="criar-organizacao-indisponivel"
              sx={{
                alignSelf: 'flex-start',
                color: 'text.secondary',
                borderColor: 'divider',
                '&.Mui-disabled': {
                  color: 'text.secondary',
                  borderColor: 'divider',
                  opacity: 1,
                },
              }}
            >
              Criar organização
            </Button>
            <Typography
              id="criar-organizacao-indisponivel"
              variant="caption"
              color="text.secondary"
              sx={{ display: 'block', mt: 0.75 }}
            >
              Criação de organização estará disponível em breve.
            </Typography>
          </Box>
        )}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
          <Button
            variant="contained"
            startIcon={<RefreshOutlinedIcon />}
            onClick={() => void refresh()}
            disabled={refreshing}
            sx={{ minHeight: 44 }}
          >
            {refreshing ? 'Atualizando…' : 'Atualizar organizações'}
          </Button>
          <Button
            startIcon={<LogoutOutlinedIcon />}
            onClick={logout}
            sx={{ minHeight: 44 }}
          >
            Sair
          </Button>
        </Stack>
        {!user?.login ? null : (
          <Typography variant="caption" color="text.secondary">
            Conta: {user.login}
          </Typography>
        )}
      </Stack>
    </Box>
  );
}
